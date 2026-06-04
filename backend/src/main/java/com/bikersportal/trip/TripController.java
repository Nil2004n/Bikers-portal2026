package com.bikersportal.trip;

import com.bikersportal.auth.SecurityUtils;
import com.bikersportal.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Page<TripDTO>> getTrips(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 100)));
        return ResponseEntity.ok(tripService.getTrips(authUserId, status, pageable));
    }

    @PostMapping
    public ResponseEntity<TripDTO> createTrip(
            @Valid @RequestBody CreateTripRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        return ResponseEntity.status(HttpStatus.CREATED).body(tripService.createTrip(req, authUserId));
    }

    @PatchMapping("/{id}/start")
    public ResponseEntity<TripDTO> startTrip(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        return ResponseEntity.ok(tripService.startTrip(id, authUserId));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<TripDTO> completeTrip(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        return ResponseEntity.ok(tripService.completeTrip(id, authUserId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTrip(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        tripService.deleteTrip(id, authUserId);
        return ResponseEntity.noContent().build();
    }
}
