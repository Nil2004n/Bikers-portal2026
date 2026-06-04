package com.bikersportal.user;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
    @Size(min = 2, max = 100)
    private String fullName;

    @Size(min = 3, max = 50)
    private String username;

    @Size(max = 100)
    private String location;

    @Size(max = 1000)
    private String bio;

    @Size(max = 5_000_000, message = "Avatar too large")
    private String avatarBase64;

    private String avatarMimeType;
}
