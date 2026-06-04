package com.bikersportal.user;

import com.bikersportal.bike.RentalDTO;
import com.bikersportal.bike.RentalRepository;
import com.bikersportal.feed.FeedRepository;
import com.bikersportal.trip.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final FeedRepository feedRepository;
    private final TripRepository tripRepository;
    private final RentalRepository rentalRepository;

    @Transactional(readOnly = true)
    public UserProfileDTO getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found: " + userId));
        return toProfile(user);
    }

    public UserProfileDTO updateProfile(Long userId, UpdateProfileRequest req, Long authUserId) {
        if (!userId.equals(authUserId)) {
            throw new AccessDeniedException("You can only update your own profile");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found: " + userId));
        if (req.getName() != null) user.setName(req.getName());
        if (req.getUsername() != null) {
            if (!req.getUsername().equals(user.getUsername())
                    && userRepository.existsByUsername(req.getUsername())) {
                throw new com.bikersportal.exception.ConflictException("Username already taken");
            }
            user.setUsername(req.getUsername());
        }
        if (req.getLocation() != null) user.setLocation(req.getLocation());
        if (req.getBio() != null) user.setBio(req.getBio());
        user = userRepository.save(user);
        return toProfile(user);
    }

    @Transactional(readOnly = true)
    public Page<RentalDTO> getUserRentals(Long userId, Pageable pageable) {
        return rentalRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable).map(RentalDTO::from);
    }

    private UserProfileDTO toProfile(User user) {
        long posts = feedRepository.countByUserId(user.getId());
        long trips = tripRepository.countByUserId(user.getId());
        long rentals = rentalRepository.findByUserIdOrderByCreatedAtDesc(user.getId(),
                org.springframework.data.domain.PageRequest.of(0, 1)).getTotalElements();
        return UserProfileDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .email(user.getEmail())
                .location(user.getLocation())
                .bio(user.getBio())
                .createdAt(user.getCreatedAt())
                .totalPosts(posts)
                .totalTrips(trips)
                .totalRentals(rentals)
                .build();
    }
}
