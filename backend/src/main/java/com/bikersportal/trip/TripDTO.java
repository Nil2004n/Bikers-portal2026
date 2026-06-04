package com.bikersportal.trip;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripDTO {
    private String id;
    private String name;
    private String startLocation;
    private String endLocation;
    private LocalDate plannedDate;
    private Double distanceKm;
    private String notes;
    private TripStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;

    public static TripDTO from(Trip t) {
        return TripDTO.builder()
                .id(t.getId())
                .name(t.getName())
                .startLocation(t.getStartLocation())
                .endLocation(t.getEndLocation())
                .plannedDate(t.getPlannedDate())
                .distanceKm(t.getDistanceKm())
                .notes(t.getNotes())
                .status(t.getStatus())
                .startedAt(t.getStartedAt())
                .completedAt(t.getCompletedAt())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
