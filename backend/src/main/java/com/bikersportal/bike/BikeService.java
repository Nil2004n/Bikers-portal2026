package com.bikersportal.bike;

import com.bikersportal.feed.FeedRepository;
import com.bikersportal.payment.PaymentRequest;
import com.bikersportal.payment.PaymentService;
import com.bikersportal.trip.TripRepository;
import com.bikersportal.user.User;
import com.bikersportal.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
@Transactional
public class BikeService {

    private final BikeRepository bikeRepository;
    private final RentalRepository rentalRepository;
    private final UserRepository userRepository;
    private final FeedRepository feedRepository;
    private final TripRepository tripRepository;
    private final PaymentService paymentService;

    @Transactional(readOnly = true)
    public Page<BikeDTO> getBikes(String type,
                                  String mode,
                                  BigDecimal minPrice,
                                  BigDecimal maxPrice,
                                  Pageable pageable) {
        Specification<Bike> spec = (root, query, cb) -> cb.conjunction();

        if (type != null && !type.isBlank()) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("type"), BikeType.valueOf(type.toUpperCase())));
        }
        if (minPrice != null) {
            spec = spec.and((root, q, cb) -> cb.or(
                    cb.greaterThanOrEqualTo(root.get("pricePerDay"), minPrice),
                    cb.greaterThanOrEqualTo(root.get("buyPrice"), minPrice)
            ));
        }
        if (maxPrice != null) {
            spec = spec.and((root, q, cb) -> cb.or(
                    cb.lessThanOrEqualTo(root.get("pricePerDay"), maxPrice),
                    cb.lessThanOrEqualTo(root.get("buyPrice"), maxPrice)
            ));
        }

        return bikeRepository.findAll(spec, pageable).map(BikeDTO::from);
    }

    @Transactional(readOnly = true)
    public BikeDTO getBikeById(String id) {
        Bike bike = bikeRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Bike not found: " + id));
        return BikeDTO.from(bike);
    }

    public RentalDTO createRental(CreateRentalRequest req, String authUserId) {
        if (req.getBikeId() == null || req.getStartDate() == null || req.getEndDate() == null) {
            throw new IllegalArgumentException("bikeId, startDate and endDate are required");
        }
        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw new IllegalArgumentException("endDate must be after startDate");
        }

        Bike bike = bikeRepository.findById(req.getBikeId())
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Bike not found: " + req.getBikeId()));

        if (bike.getStatus() != BikeStatus.AVAILABLE) {
            throw new IllegalArgumentException("Bike is not available for rent: status=" + bike.getStatus());
        }

        User user = userRepository.findById(authUserId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found: " + authUserId));

        long days = ChronoUnit.DAYS.between(req.getStartDate(), req.getEndDate());
        if (days < 1) days = 1;
        BigDecimal pricePerDay = bike.getPricePerDay() != null ? bike.getPricePerDay() : BigDecimal.ZERO;
        BigDecimal total = pricePerDay.multiply(BigDecimal.valueOf(days));
        if (req.isInsurance()) {
            total = total.multiply(new BigDecimal("1.10"));
        }
        total = total.setScale(2, RoundingMode.HALF_UP);

        Rental rental = Rental.builder()
                .user(user)
                .bike(bike)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .insurance(req.isInsurance())
                .totalCost(total)
                .status(RentalStatus.CONFIRMED)
                .build();
        rental = rentalRepository.save(rental);

        bike.setStatus(BikeStatus.RENTED);
        bike.setAvailable(false);
        bikeRepository.save(bike);

        try {
            paymentService.initiatePayment(PaymentRequest.builder()
                    .userId(user.getId())
                    .rentalId(rental.getId())
                    .amount(total)
                    .currency("INR")
                    .type(req.isInsurance() ? "INSURANCE" : "RENTAL")
                    .build());
        } catch (Exception ignored) {
        }

        return RentalDTO.from(rental);
    }

    @Transactional(readOnly = true)
    public Page<RentalDTO> getUserRentals(String userId, Pageable pageable) {
        return rentalRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable).map(RentalDTO::from);
    }
}
