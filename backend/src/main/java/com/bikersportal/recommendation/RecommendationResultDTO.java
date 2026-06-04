package com.bikersportal.recommendation;

import com.bikersportal.bike.BikeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationResultDTO {
    private Long bikeId;
    private String bikeName;
    private int matchScore;
    private String explanation;
    private String priceRange;
    private BikeType type;
}
