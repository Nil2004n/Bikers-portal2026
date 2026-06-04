package com.bikersportal.recommendation;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationRequest {
    @NotBlank
    private String style;

    @NotNull
    @Min(0)
    private BigDecimal budget;

    @NotBlank
    private String experience;

    @NotBlank
    private String terrain;

    @Min(0)
    private int hoursPerWeek;

    private String notes;
}
