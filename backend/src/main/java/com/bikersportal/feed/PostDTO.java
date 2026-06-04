package com.bikersportal.feed;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostDTO {
    private Long id;
    private UserMini user;
    private String content;
    private String imageUrl;
    private List<String> tags;
    private int likeCount;
    private long commentCount;
    private boolean likedByMe;
    private LocalDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserMini {
        private Long id;
        private String name;
    }
}
