package com.bikersportal.bike;

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

import java.math.BigDecimal;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BikeController {

    private final BikeService bikeService;

    @GetMapping("/bikes")
    public ResponseEntity<Page<BikeDTO>> getBikes(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String mode,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 100)));
        return ResponseEntity.ok(bikeService.getBikes(type, mode, minPrice, maxPrice, pageable));
    }

    @GetMapping("/bikes/{id}")
    public ResponseEntity<BikeDTO> getBike(@PathVariable String id) {
        return ResponseEntity.ok(bikeService.getBikeById(id));
    }

    @PostMapping("/rentals")
    public ResponseEntity<RentalDTO> createRental(
            @Valid @RequestBody CreateRentalRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        String authUserId = com.bikersportal.auth.SecurityUtils.userIdFromPrincipal(userDetails, null);
        RentalDTO dto = bikeService.createRental(req, authUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }
}
