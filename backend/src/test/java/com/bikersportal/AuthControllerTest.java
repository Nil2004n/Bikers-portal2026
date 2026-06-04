package com.bikersportal;

import com.bikersportal.auth.AuthService;
import com.bikersportal.auth.LoginRequest;
import com.bikersportal.auth.RegisterRequest;
import com.bikersportal.exception.ConflictException;
import com.bikersportal.user.User;
import com.bikersportal.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void cleanDb() {
        userRepository.deleteAll();
    }

    @Test
    void registerSuccess() throws Exception {
        RegisterRequest req = RegisterRequest.builder()
                .fullName("Alice")
                .username("alice")
                .email("alice@example.com")
                .password("password123")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("alice@example.com"))
                .andExpect(jsonPath("$.user.fullName").value("Alice"));

        assertThat(userRepository.findByEmail("alice@example.com")).isPresent();
    }

    @Test
    void registerDuplicateEmail() throws Exception {
        RegisterRequest req = RegisterRequest.builder()
                .fullName("Bob")
                .email("bob@example.com")
                .password("password123")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    @Test
    void loginSuccess() throws Exception {
        RegisterRequest reg = RegisterRequest.builder()
                .fullName("Cara")
                .email("cara@example.com")
                .password("password123")
                .build();
        authService.register(reg);

        LoginRequest login = LoginRequest.builder()
                .email("cara@example.com")
                .password("password123")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("cara@example.com"));
    }

    @Test
    void loginWrongPassword() throws Exception {
        RegisterRequest reg = RegisterRequest.builder()
                .fullName("Dan")
                .email("dan@example.com")
                .password("password123")
                .build();
        authService.register(reg);

        LoginRequest login = LoginRequest.builder()
                .email("dan@example.com")
                .password("WRONG")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginUnknownEmail() throws Exception {
        LoginRequest login = LoginRequest.builder()
                .email("nobody@example.com")
                .password("whatever")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void serviceRegisterDuplicate() {
        RegisterRequest req = RegisterRequest.builder()
                .fullName("Eve")
                .email("eve@example.com")
                .password("password123")
                .build();
        authService.register(req);
        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void passwordIsHashed() {
        RegisterRequest req = RegisterRequest.builder()
                .fullName("Frank")
                .email("frank@example.com")
                .password("plain123")
                .build();
        authService.register(req);

        User saved = userRepository.findByEmail("frank@example.com").orElseThrow();
        assertThat(saved.getPasswordHash()).isNotEqualTo("plain123");
        assertThat(passwordEncoder.matches("plain123", saved.getPasswordHash())).isTrue();
    }
}
