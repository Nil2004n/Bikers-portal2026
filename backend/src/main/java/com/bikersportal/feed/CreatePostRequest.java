package com.bikersportal.feed;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePostRequest {
    @NotBlank
    @Size(max = 1000)
    private String content;

    @Size(max = 1000)
    private String imageUrl;

    @Builder.Default
    private List<String> tags = new ArrayList<>();
}
