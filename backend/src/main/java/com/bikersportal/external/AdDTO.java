package com.bikersportal.external;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdDTO {
    private String id;
    private String title;
    private String imageUrl;
    private String targetUrl;
    private String context;
}
