package com.bikersportal.user;

import com.bikersportal.bike.RentalDTO;
import com.bikersportal.bike.RentalRepository;
import com.bikersportal.feed.FeedRepository;
import com.bikersportal.storage.SupabaseStorageService;
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
    private final SupabaseStorageService storageService;

    @Transactional(readOnly = true)
    public UserProfileDTO getProfile(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found: " + userId));
        return toProfile(user);
    }

    public UserProfileDTO updateProfile(String userId, UpdateProfileRequest req, String authUserId) {
        if (!userId.equals(authUserId)) {
            throw new AccessDeniedException("You can only update your own profile");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found: " + userId));
        if (req.getFullName() != null) user.setFullName(req.getFullName());
        if (req.getUsername() != null) {
            if (!req.getUsername().equals(user.getUsername())
                    && userRepository.existsByUsername(req.getUsername())) {
                throw new com.bikersportal.exception.ConflictException("Username already taken");
            }
            user.setUsername(req.getUsername());
        }
        if (req.getLocation() != null) user.setLocation(req.getLocation());
        if (req.getBio() != null) user.setBio(req.getBio());

        if (req.getAvatarBase64() != null && !req.getAvatarBase64().isBlank()) {
            try {
                String mimeType = req.getAvatarMimeType() != null ? req.getAvatarMimeType() : "image/jpeg";
                String base64 = req.getAvatarBase64().replaceAll("^data:[^;]+;base64,", "");
                String fileName = storageService.generateFileName("avatars", authUserId, mimeType);
                String avatarUrl = storageService.uploadBase64Image(base64, fileName, mimeType);
                user.setAvatarUrl(avatarUrl);
            } catch (Exception ex) {
                // avatar upload failure must not fail the profile update
            }
        }

        user = userRepository.save(user);
        return toProfile(user);
    }

    @Transactional(readOnly = true)
    public Page<RentalDTO> getUserRentals(String userId, Pageable pageable) {
        return rentalRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable).map(RentalDTO::from);
    }

    private UserProfileDTO toProfile(User user) {
        long posts = feedRepository.countByUserId(user.getId());
        long trips = tripRepository.countByUserId(user.getId());
        long rentals = rentalRepository.findByUserIdOrderByCreatedAtDesc(user.getId(),
                org.springframework.data.domain.PageRequest.of(0, 1)).getTotalElements();
        return UserProfileDTO.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .location(user.getLocation())
                .bio(user.getBio())
                .avatarUrl(user.getAvatarUrl())
                .createdAt(user.getCreatedAt())
                .totalPosts(posts)
                .totalTrips(trips)
                .totalRentals(rentals)
                .build();
    }
}
