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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String brand;

    @Enumerated(EnumType.STRING)
    private BikeType type;

    @Enumerated(EnumType.STRING)
    private BikeMode mode;

    @Column(precision = 10, scale = 2)
    private BigDecimal pricePerDay;

    @Column(precision = 12, scale = 2)
    private BigDecimal salePrice;

    @Column(length = 1000)
    private String imageUrl;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BikeStatus status = BikeStatus.AVAILABLE;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
