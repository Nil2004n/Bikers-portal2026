package com.bikersportal.recommendation;

import com.bikersportal.auth.SecurityUtils;
import com.bikersportal.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final UserRepository userRepository;

    @PostMapping("/recommend")
    public ResponseEntity<List<RecommendationResultDTO>> recommend(
            @Valid @RequestBody RecommendationRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long authUserId = SecurityUtils.userIdFromPrincipal(userDetails, userRepository);
        return ResponseEntity.ok(recommendationService.getRecommendations(req, authUserId));
    }
}
