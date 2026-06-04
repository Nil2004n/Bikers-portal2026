package com.bikersportal;

import com.bikersportal.bike.*;
import com.bikersportal.feed.FeedRepository;
import com.bikersportal.payment.PaymentService;
import com.bikersportal.trip.TripRepository;
import com.bikersportal.user.User;
import com.bikersportal.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BikeServiceTest {

    @Mock private BikeRepository bikeRepository;
    @Mock private RentalRepository rentalRepository;
    @Mock private UserRepository userRepository;
    @Mock private FeedRepository feedRepository;
    @Mock private TripRepository tripRepository;
    @Mock private PaymentService paymentService;

    @InjectMocks private BikeService bikeService;

    private Bike sampleBike;

    @BeforeEach
    void setUp() {
        sampleBike = Bike.builder()
                .id(1L)
                .name("Trek X1")
                .brand("Trek")
                .type(BikeType.MTB)
                .mode(BikeMode.RENT)
                .pricePerDay(new BigDecimal("500.00"))
                .salePrice(new BigDecimal("45000.00"))
                .status(BikeStatus.AVAILABLE)
                .build();
    }

    @Test
    void getBikes_noFilters_returnsAllBikes() {
        Pageable pageable = PageRequest.of(0, 10);
        when(bikeRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(sampleBike)));

        Page<BikeDTO> result = bikeService.getBikes(null, null, null, null, pageable);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Trek X1");
    }

    @Test
    void getBikes_typeFilter_returnsOnlyMatchingType() {
        Pageable pageable = PageRequest.of(0, 10);
        when(bikeRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(sampleBike)));

        Page<BikeDTO> result = bikeService.getBikes("MTB", null, null, null, pageable);
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getType()).isEqualTo(BikeType.MTB);
    }

    @Test
    void createRental_bikeAvailable_success() {
        User user = User.builder().id(10L).email("u@e.com").name("U").build();
        when(bikeRepository.findById(1L)).thenReturn(Optional.of(sampleBike));
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(rentalRepository.save(any(Rental.class))).thenAnswer(inv -> {
            Rental r = inv.getArgument(0);
            r.setId(99L);
            return r;
        });

        CreateRentalRequest req = CreateRentalRequest.builder()
                .bikeId(1L)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(2))
                .insurance(false)
                .build();

        RentalDTO result = bikeService.createRental(req, 10L);
        assertThat(result.getId()).isEqualTo(99L);
        assertThat(result.getTotalCost()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(sampleBike.getStatus()).isEqualTo(BikeStatus.RENTED);
        verify(paymentService).initiatePayment(any());
    }

    @Test
    void createRental_bikeNotAvailable_throwsException() {
        sampleBike.setStatus(BikeStatus.RENTED);
        when(bikeRepository.findById(1L)).thenReturn(Optional.of(sampleBike));

        CreateRentalRequest req = CreateRentalRequest.builder()
                .bikeId(1L)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(1))
                .insurance(false)
                .build();

        assertThatThrownBy(() -> bikeService.createRental(req, 10L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createRental_insuranceTrue_adds10Percent() {
        User user = User.builder().id(10L).email("u@e.com").name("U").build();
        when(bikeRepository.findById(1L)).thenReturn(Optional.of(sampleBike));
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(rentalRepository.save(any(Rental.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateRentalRequest req = CreateRentalRequest.builder()
                .bikeId(1L)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(2)) // 2 days * 500 = 1000
                .insurance(true)
                .build();

        RentalDTO result = bikeService.createRental(req, 10L);
        // 1000 * 1.10 = 1100
        assertThat(result.getTotalCost()).isEqualByComparingTo(new BigDecimal("1100.00"));
    }

    private static <T> T eq(T value) {
        return org.mockito.ArgumentMatchers.eq(value);
    }
}
