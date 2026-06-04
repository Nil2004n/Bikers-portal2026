package com.bikersportal.trip;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TripRepository extends JpaRepository<Trip, String> {
    Page<Trip> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Page<Trip> findByUserIdAndStatusOrderByCreatedAtDesc(String userId, TripStatus status, Pageable pageable);

    long countByUserId(String userId);
}
