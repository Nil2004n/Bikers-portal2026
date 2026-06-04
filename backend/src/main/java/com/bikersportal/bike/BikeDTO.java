package com.bikersportal.bike;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BikeDTO {
    private Long id;
    private String name;
    private String brand;
    private BikeType type;
    private BikeMode mode;
    private BigDecimal pricePerDay;
    private BigDecimal salePrice;
    private String imageUrl;
    private String description;
    private BikeStatus status;

    public static BikeDTO from(Bike bike) {
        return BikeDTO.builder()
                .id(bike.getId())
                .name(bike.getName())
                .brand(bike.getBrand())
                .type(bike.getType())
                .mode(bike.getMode())
                .pricePerDay(bike.getPricePerDay())
                .salePrice(bike.getSalePrice())
                .imageUrl(bike.getImageUrl())
                .description(bike.getDescription())
                .status(bike.getStatus())
                .build();
    }
}
