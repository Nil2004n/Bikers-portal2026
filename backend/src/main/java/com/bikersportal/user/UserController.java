package com.bikersportal.user;

import com.bikersportal.auth.SecurityUtils;
import com.bikersportal.bike.RentalDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;

    @GetMapping("/{id}")
    public ResponseEntity<UserProfileDTO> getProfile(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getProfile(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserProfileDTO> updateProfile(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProfileRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        if (authUserId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required");
        }
        return ResponseEntity.ok(userService.updateProfile(id, req, authUserId));
    }

    @GetMapping("/{id}/rentals")
    public ResponseEntity<Page<RentalDTO>> getUserRentals(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 100)));
        return ResponseEntity.ok(userService.getUserRentals(id, pageable));
    }
}
