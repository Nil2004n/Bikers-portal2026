package com.bikersportal.feed;

import com.bikersportal.auth.SecurityUtils;
import com.bikersportal.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
public class FeedController {

    private final FeedService feedService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Page<PostDTO>> getFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        return ResponseEntity.ok(feedService.getFeed(page, limit, userId, authUserId));
    }

    @PostMapping
    public ResponseEntity<PostDTO> createPost(
            @Valid @RequestBody CreatePostRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        String authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        return ResponseEntity.status(HttpStatus.CREATED).body(feedService.createPost(req, authUserId));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<LikeResponse> toggleLike(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        return ResponseEntity.ok(feedService.toggleLike(id, authUserId));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<Page<CommentDTO>> getComments(
            @PathVariable String id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 100)));
        return ResponseEntity.ok(feedService.getComments(id, pageable));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentDTO> addComment(
            @PathVariable String id,
            @Valid @RequestBody CommentBody body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(feedService.addComment(id, body.getContent(), authUserId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        feedService.deletePost(id, authUserId);
        return ResponseEntity.noContent().build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommentBody {
        @NotBlank
        @Size(max = 500)
        private String content;
    }
}
