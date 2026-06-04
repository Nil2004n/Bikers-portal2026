package com.bikersportal.trip;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTripRequest {
    @NotBlank
    private String name;

    private String startLocation;
    private String endLocation;
    private LocalDate plannedDate;
    private Double distanceKm;
    private String notes;
}
