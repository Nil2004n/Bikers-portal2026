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
    private String id;
    private String name;
    private String brand;
    private String model;
    private BikeType type;
    private BikeStatus status;
    private BigDecimal pricePerDay;
    private BigDecimal buyPrice;
    private String description;
    private String location;
    private String imageUrl;
    private boolean isAvailable;

    public static BikeDTO from(Bike bike) {
        return BikeDTO.builder()
                .id(bike.getId())
                .name(bike.getName())
                .brand(bike.getBrand())
                .model(bike.getModel())
                .type(bike.getType())
                .status(bike.getStatus())
                .pricePerDay(bike.getPricePerDay())
                .buyPrice(bike.getBuyPrice())
                .description(bike.getDescription())
                .location(bike.getLocation())
                .imageUrl(bike.getImageUrl())
                .isAvailable(bike.isAvailable())
                .build();
    }
}
