package com.bikersportal.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDTO {
    private String id;
    private String fullName;
    private String username;
    private String email;
    private String role;
    private String location;
    private String bio;
    private String avatarUrl;
    private LocalDateTime createdAt;
    private long totalPosts;
    private long totalTrips;
    private long totalRentals;
}
