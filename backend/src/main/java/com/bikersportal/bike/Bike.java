package com.bikersportal.bike;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bikes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Bike {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "VARCHAR(36)")
    private String id;

    @Column(nullable = false)
    private String name;

    private String brand;

    private String model;

    @Enumerated(EnumType.STRING)
    private BikeType type;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BikeStatus status = BikeStatus.AVAILABLE;

    @Column(name = "price_per_day", precision = 10, scale = 2)
    private BigDecimal pricePerDay;

    @Column(name = "buy_price", precision = 12, scale = 2)
    private BigDecimal buyPrice;

    @Column(length = 2000)
    private String description;

    private String location;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "is_available", nullable = false)
    @Builder.Default
    private boolean isAvailable = true;

    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @org.hibernate.annotations.UpdateTimestamp
    private LocalDateTime updatedAt;
}
