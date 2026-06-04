package com.bikersportal.auth;

import com.bikersportal.user.User;
import com.bikersportal.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static String userIdFromPrincipal(UserDetails userDetails, UserRepository userRepository) {
        if (userDetails instanceof User u && u.getId() != null) {
            return u.getId();
        }
        if (userDetails != null && userRepository != null) {
            return userRepository.findByEmail(userDetails.getUsername())
                    .map(User::getId)
                    .orElse(null);
        }
        return userIdFromJwt();
    }

    public static String userIdFromJwt() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            HttpServletRequest req = attrs.getRequest();
            String header = req.getHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) return null;
            String token = header.substring(7);
            JwtUtil jwtUtil = BeanProvider.getBean(JwtUtil.class);
            if (jwtUtil == null) return null;
            return jwtUtil.extractUserId(token);
        } catch (Exception ex) {
            return null;
        }
    }

    public static String emailOf(Authentication auth) {
        if (auth == null) return null;
        Object p = auth.getPrincipal();
        if (p instanceof UserDetails ud) return ud.getUsername();
        return auth.getName();
    }

    public static Authentication currentAuth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }
}
