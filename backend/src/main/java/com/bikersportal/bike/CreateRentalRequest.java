package com.bikersportal.bike;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRentalRequest {
    private String bikeId;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean insurance;
}
