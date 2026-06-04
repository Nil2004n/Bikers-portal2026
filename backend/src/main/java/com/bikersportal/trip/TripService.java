package com.bikersportal.trip;

import com.bikersportal.user.User;
import com.bikersportal.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class TripService {

    private final TripRepository tripRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<TripDTO> getTrips(Long authUserId, String status, Pageable pageable) {
        if (status != null && !status.isBlank()) {
            TripStatus ts;
            try {
                ts = TripStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Invalid status: " + status);
            }
            return tripRepository
                    .findByUserIdAndStatusOrderByCreatedAtDesc(authUserId, ts, pageable)
                    .map(TripDTO::from);
        }
        return tripRepository.findByUserIdOrderByCreatedAtDesc(authUserId, pageable).map(TripDTO::from);
    }

    public TripDTO createTrip(CreateTripRequest req, Long authUserId) {
        User user = userRepository.findById(authUserId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found: " + authUserId));
        Trip trip = Trip.builder()
                .user(user)
                .name(req.getName())
                .startLocation(req.getStartLocation())
                .endLocation(req.getEndLocation())
                .plannedDate(req.getPlannedDate())
                .distanceKm(req.getDistanceKm())
                .notes(req.getNotes())
                .status(TripStatus.PLANNED)
                .build();
        return TripDTO.from(tripRepository.save(trip));
    }

    public TripDTO startTrip(Long tripId, Long authUserId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Trip not found: " + tripId));
        assertOwner(trip, authUserId);
        trip.setStatus(TripStatus.ACTIVE);
        trip.setStartedAt(LocalDateTime.now());
        return TripDTO.from(tripRepository.save(trip));
    }

    public TripDTO completeTrip(Long tripId, Long authUserId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Trip not found: " + tripId));
        assertOwner(trip, authUserId);
        trip.setStatus(TripStatus.COMPLETED);
        trip.setCompletedAt(LocalDateTime.now());
        return TripDTO.from(tripRepository.save(trip));
    }

    public void deleteTrip(Long tripId, Long authUserId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Trip not found: " + tripId));
        assertOwner(trip, authUserId);
        tripRepository.delete(trip);
    }

    private void assertOwner(Trip trip, Long authUserId) {
        if (trip.getUser() == null || !trip.getUser().getId().equals(authUserId)) {
            throw new AccessDeniedException("Not your trip");
        }
    }
}
