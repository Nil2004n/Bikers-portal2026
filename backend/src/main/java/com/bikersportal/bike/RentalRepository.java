package com.bikersportal.bike;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RentalRepository extends JpaRepository<Rental, String> {
    Page<Rental> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    List<Rental> findByBikeIdAndStatus(String bikeId, RentalStatus status);
}
