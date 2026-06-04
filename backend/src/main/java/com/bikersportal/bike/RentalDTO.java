package com.bikersportal.bike;

import com.bikersportal.user.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentalDTO {
    private Long id;
    private BikeInfo bike;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean insurance;
    private BigDecimal totalCost;
    private RentalStatus status;
    private LocalDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BikeInfo {
        private Long id;
        private String name;
    }

    public static RentalDTO from(Rental rental) {
        Bike b = rental.getBike();
        User u = rental.getUser();
        return RentalDTO.builder()
                .id(rental.getId())
                .bike(BikeInfo.builder().id(b != null ? b.getId() : null).name(b != null ? b.getName() : null).build())
                .startDate(rental.getStartDate())
                .endDate(rental.getEndDate())
                .insurance(rental.isInsurance())
                .totalCost(rental.getTotalCost())
                .status(rental.getStatus())
                .createdAt(rental.getCreatedAt())
                .build();
    }
}
