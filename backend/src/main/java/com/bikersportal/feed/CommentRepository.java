package com.bikersportal.feed;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, String> {
    org.springframework.data.domain.Page<Comment> findByPostIdOrderByCreatedAtAsc(String postId, org.springframework.data.domain.Pageable pageable);

    long countByPostId(String postId);
}
