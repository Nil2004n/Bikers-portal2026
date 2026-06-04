package com.bikersportal;

import com.bikersportal.trip.*;
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
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripServiceTest {

    @Mock private TripRepository tripRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private TripService tripService;

    private User owner;
    private User other;
    private Trip plannedTrip;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).email("o@e.com").name("Owner").build();
        other = User.builder().id(2L).email("x@e.com").name("Other").build();
        plannedTrip = Trip.builder()
                .id(100L)
                .user(owner)
                .name("Mumbai -> Pune")
                .startLocation("Mumbai")
                .endLocation("Pune")
                .status(TripStatus.PLANNED)
                .build();
    }

    @Test
    void createTrip_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> {
            Trip t = inv.getArgument(0);
            t.setId(200L);
            return t;
        });

        CreateTripRequest req = CreateTripRequest.builder()
                .name("Test ride")
                .startLocation("A")
                .endLocation("B")
                .build();

        TripDTO result = tripService.createTrip(req, 1L);
        assertThat(result.getId()).isEqualTo(200L);
        assertThat(result.getStatus()).isEqualTo(TripStatus.PLANNED);
    }

    @Test
    void startTrip_setsStatusActive() {
        when(tripRepository.findById(100L)).thenReturn(Optional.of(plannedTrip));
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> inv.getArgument(0));

        TripDTO result = tripService.startTrip(100L, 1L);
        assertThat(result.getStatus()).isEqualTo(TripStatus.ACTIVE);
        assertThat(result.getStartedAt()).isNotNull();
    }

    @Test
    void completeTrip_setsStatusCompleted() {
        when(tripRepository.findById(100L)).thenReturn(Optional.of(plannedTrip));
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> inv.getArgument(0));

        TripDTO result = tripService.completeTrip(100L, 1L);
        assertThat(result.getStatus()).isEqualTo(TripStatus.COMPLETED);
        assertThat(result.getCompletedAt()).isNotNull();
    }

    @Test
    void deleteTrip_notOwner_throwsAccessDenied() {
        when(tripRepository.findById(100L)).thenReturn(Optional.of(plannedTrip));

        assertThatThrownBy(() -> tripService.deleteTrip(100L, 2L))
                .isInstanceOf(AccessDeniedException.class);

        verify(tripRepository, never()).delete(any());
    }

    @Test
    void getTrips_filterByStatus_returnsCorrectTrips() {
        Pageable pageable = PageRequest.of(0, 10);
        Trip activeTrip = Trip.builder()
                .id(101L).user(owner).name("A").status(TripStatus.ACTIVE).build();
        when(tripRepository.findByUserIdAndStatusOrderByCreatedAtDesc(1L, TripStatus.ACTIVE, pageable))
                .thenReturn(new PageImpl<>(List.of(activeTrip)));

        Page<TripDTO> result = tripService.getTrips(1L, "ACTIVE", pageable);
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getStatus()).isEqualTo(TripStatus.ACTIVE);
    }
}
