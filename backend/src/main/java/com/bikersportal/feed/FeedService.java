package com.bikersportal.feed;

import com.bikersportal.storage.SupabaseStorageService;
import com.bikersportal.user.User;
import com.bikersportal.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class FeedService {

    private final FeedRepository feedRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final UserRepository userRepository;
    private final SupabaseStorageService storageService;

    @Transactional(readOnly = true)
    public Page<PostDTO> getFeed(int page, int limit, String filterUserId, String authUserId) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                Math.max(0, page), Math.max(1, Math.min(limit, 100)));

        Page<Post> posts = (filterUserId != null)
                ? feedRepository.findByUserIdOrderByCreatedAtDesc(filterUserId, pageable)
                : feedRepository.findAllByOrderByCreatedAtDesc(pageable);

        Set<String> likedByMe = new HashSet<>(postLikeRepository.findPostIdsByUserId(authUserId));

        List<PostDTO> mapped = posts.stream().map(p -> toDto(p, likedByMe.contains(p.getId()))).toList();
        return new PageImpl<>(mapped, pageable, posts.getTotalElements());
    }

    public PostDTO createPost(CreatePostRequest req, String authUserId) {
        User user = userRepository.findById(authUserId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found: " + authUserId));

        String imageUrl = req.getImageUrl();
        if (req.getImageBase64() != null && !req.getImageBase64().isBlank()) {
            try {
                String mimeType = req.getImageMimeType() != null ? req.getImageMimeType() : "image/jpeg";
                String base64 = req.getImageBase64().replaceAll("^data:[^;]+;base64,", "");
                String fileName = storageService.generateFileName("posts", authUserId, mimeType);
                imageUrl = storageService.uploadBase64Image(base64, fileName, mimeType);
            } catch (Exception ex) {
                // storage failure must not fail the post creation
            }
        }

        Post post = Post.builder()
                .user(user)
                .title(req.getTitle())
                .content(req.getContent())
                .imageUrl(imageUrl)
                .tags(req.getTags() != null ? req.getTags() : new java.util.ArrayList<>())
                .likeCount(0)
                .isDeleted(false)
                .build();
        post = feedRepository.save(post);
        return toDto(post, false);
    }

    public LikeResponse toggleLike(String postId, String authUserId) {
        Post post = feedRepository.findById(postId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Post not found: " + postId));

        return postLikeRepository.findByPostIdAndUserId(postId, authUserId)
                .map(existing -> {
                    postLikeRepository.delete(existing);
                    post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
                    feedRepository.save(post);
                    return LikeResponse.builder().liked(false).likeCount(post.getLikeCount()).build();
                })
                .orElseGet(() -> {
                    PostLike like = PostLike.builder().postId(postId).userId(authUserId).build();
                    postLikeRepository.save(like);
                    post.setLikeCount(post.getLikeCount() + 1);
                    feedRepository.save(post);
                    return LikeResponse.builder().liked(true).likeCount(post.getLikeCount()).build();
                });
    }

    @Transactional(readOnly = true)
    public Page<CommentDTO> getComments(String postId, Pageable pageable) {
        if (!feedRepository.existsById(postId)) {
            throw new jakarta.persistence.EntityNotFoundException("Post not found: " + postId);
        }
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId, pageable).map(this::toCommentDto);
    }

    public CommentDTO addComment(String postId, String content, String authUserId) {
        Post post = feedRepository.findById(postId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Post not found: " + postId));
        User user = userRepository.findById(authUserId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found: " + authUserId));
        Comment c = Comment.builder()
                .post(post)
                .user(user)
                .content(content)
                .build();
        c = commentRepository.save(c);
        return toCommentDto(c);
    }

    public void deletePost(String postId, String authUserId) {
        Post post = feedRepository.findById(postId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Post not found: " + postId));
        if (post.getUser() == null || !post.getUser().getId().equals(authUserId)) {
            throw new AccessDeniedException("You can only delete your own posts");
        }
        if (post.getImageUrl() != null) {
            try {
                String bucket = storageService.getBucket();
                String fileName = post.getImageUrl()
                        .replaceAll(".*\\/object\\/public\\/" + java.util.regex.Pattern.quote(bucket) + "\\/", "");
                storageService.deleteFile(fileName);
            } catch (Exception ignored) {
            }
        }
        feedRepository.delete(post);
    }

    private PostDTO toDto(Post p, boolean likedByMe) {
        User u = p.getUser();
        long commentCount = commentRepository.countByPostId(p.getId());
        return PostDTO.builder()
                .id(p.getId())
                .user(PostDTO.UserMini.builder()
                        .id(u != null ? u.getId() : null)
                        .fullName(u != null ? u.getFullName() : null)
                        .build())
                .title(p.getTitle())
                .content(p.getContent())
                .imageUrl(p.getImageUrl())
                .tags(p.getTags())
                .likeCount(p.getLikeCount())
                .commentCount(commentCount)
                .likedByMe(likedByMe)
                .isDeleted(p.isDeleted())
                .createdAt(p.getCreatedAt())
                .build();
    }

    private CommentDTO toCommentDto(Comment c) {
        User u = c.getUser();
        return CommentDTO.builder()
                .id(c.getId())
                .user(CommentDTO.UserMini.builder()
                        .id(u != null ? u.getId() : null)
                        .fullName(u != null ? u.getFullName() : null)
                        .build())
                .content(c.getContent())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
