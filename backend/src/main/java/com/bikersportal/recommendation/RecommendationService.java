package com.bikersportal.recommendation;

import com.bikersportal.bike.Bike;
import com.bikersportal.bike.BikeRepository;
import com.bikersportal.user.User;
import com.bikersportal.user.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class RecommendationService {

    private final BikeRepository bikeRepository;
    private final UserRepository userRepository;
    private final RecommendationRepository recommendationRepository;
    private final ObjectMapper objectMapper;
    private final WebClient aiWebClient;
    private final String aiModel;

    public RecommendationService(BikeRepository bikeRepository,
                                 UserRepository userRepository,
                                 RecommendationRepository recommendationRepository,
                                 ObjectMapper objectMapper,
                                 @Qualifier("aiWebClient") WebClient aiWebClient,
                                 @Value("${app.ai-model}") String aiModel) {
        this.bikeRepository = bikeRepository;
        this.userRepository = userRepository;
        this.recommendationRepository = recommendationRepository;
        this.objectMapper = objectMapper;
        this.aiWebClient = aiWebClient;
        this.aiModel = aiModel;
    }

    @Transactional
    public List<RecommendationResultDTO> getRecommendations(RecommendationRequest req, Long authUserId) {
        List<Bike> allBikes = bikeRepository.findAll();
        if (allBikes.isEmpty()) {
            return List.of();
        }

        String bikeListJson = serializeBikes(allBikes);
        String prompt = buildPrompt(bikeListJson, req);

        String aiRaw = null;
        try {
            OllamaRequest ollamaReq = OllamaRequest.builder()
                    .model(aiModel)
                    .prompt(prompt)
                    .stream(false)
                    .options(OllamaRequest.Options.builder().temperature(0.3).build())
                    .build();

            OllamaResponse ollamaResp = aiWebClient.post()
                    .uri("/api/generate")
                    .bodyValue(ollamaReq)
                    .retrieve()
                    .bodyToMono(OllamaResponse.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (ollamaResp != null && ollamaResp.getResponse() != null) {
                aiRaw = ollamaResp.getResponse();
            }
        } catch (Exception ex) {
            log.warn("Ollama call failed, falling back to heuristic: {}", ex.getMessage());
        }

        List<RecommendationResultDTO> results;
        if (aiRaw != null && !aiRaw.isBlank()) {
            try {
                results = parseAiResponse(aiRaw, allBikes);
            } catch (Exception ex) {
                log.warn("Failed to parse AI response, falling back. Raw: {}", aiRaw);
                results = fallbackRecommendations(allBikes, req);
            }
        } else {
            results = fallbackRecommendations(allBikes, req);
        }

        // Persist the request + raw AI response
        try {
            User user = userRepository.findById(authUserId).orElse(null);
            Recommendation rec = Recommendation.builder()
                    .user(user)
                    .ridingStyle(req.getStyle())
                    .budget(req.getBudget())
                    .experience(req.getExperience())
                    .terrain(req.getTerrain())
                    .hoursPerWeek(req.getHoursPerWeek())
                    .notes(req.getNotes())
                    .aiResponse(aiRaw != null ? aiRaw : objectMapper.writeValueAsString(results))
                    .build();
            recommendationRepository.save(rec);
        } catch (Exception ex) {
            log.warn("Could not persist recommendation: {}", ex.getMessage());
        }

        return results;
    }

    private List<RecommendationResultDTO> parseAiResponse(String raw, List<Bike> bikes) throws Exception {
        String json = stripCodeFences(raw);
        List<Map<String, Object>> rawList = objectMapper.readValue(json, new TypeReference<>() {
        });
        List<RecommendationResultDTO> out = new ArrayList<>();
        for (Map<String, Object> item : rawList) {
            RecommendationResultDTO dto = RecommendationResultDTO.builder()
                    .bikeId(asLong(item.get("bikeId")))
                    .bikeName(asString(item.get("bikeName")))
                    .matchScore(asInt(item.get("matchScore")))
                    .explanation(asString(item.get("explanation")))
                    .priceRange(asString(item.get("priceRange")))
                    .type(com.bikersportal.bike.BikeType.valueOf(asStringOr(item.get("type"), "ROAD")))
                    .build();
            out.add(dto);
        }
        return out;
    }

    private List<RecommendationResultDTO> fallbackRecommendations(List<Bike> bikes, RecommendationRequest req) {
        BigDecimal budget = req.getBudget() != null ? req.getBudget() : BigDecimal.ZERO;
        return bikes.stream()
                .sorted(Comparator.comparing(b -> {
                    BigDecimal p = b.getPricePerDay() != null ? b.getPricePerDay()
                            : (b.getSalePrice() != null ? b.getSalePrice() : BigDecimal.ZERO);
                    return p.subtract(budget).abs();
                }))
                .limit(3)
                .map(b -> RecommendationResultDTO.builder()
                        .bikeId(b.getId())
                        .bikeName(b.getName())
                        .matchScore(75)
                        .explanation("Recommended based on your budget.")
                        .priceRange(b.getPricePerDay() != null
                                ? "INR " + b.getPricePerDay() + "/day"
                                : (b.getSalePrice() != null ? "INR " + b.getSalePrice() : "Contact"))
                        .type(b.getType())
                        .build())
                .toList();
    }

    private String buildPrompt(String bikeListJson, RecommendationRequest req) {
        return "You are a bike expert. Recommend bikes from this inventory: " + bikeListJson
                + " User preferences: riding style=" + req.getStyle()
                + ", budget=INR " + req.getBudget()
                + ", experience=" + req.getExperience()
                + ", terrain=" + req.getTerrain()
                + ", hours/week=" + req.getHoursPerWeek()
                + ". Return JSON array of top 3 bikes: "
                + "[{ bikeId, bikeName, matchScore(0-100), explanation(2 sentences), priceRange, type }]"
                + " Return ONLY valid JSON, no markdown.";
    }

    private String serializeBikes(List<Bike> bikes) {
        try {
            List<Map<String, Object>> arr = new ArrayList<>();
            for (Bike b : bikes) {
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("bikeId", b.getId());
                m.put("bikeName", b.getName());
                m.put("type", b.getType() != null ? b.getType().name() : null);
                m.put("pricePerDay", b.getPricePerDay());
                m.put("salePrice", b.getSalePrice());
                m.put("description", b.getDescription());
                arr.add(m);
            }
            return objectMapper.writeValueAsString(arr);
        } catch (Exception ex) {
            return "[]";
        }
    }

    private String stripCodeFences(String raw) {
        String s = raw.trim();
        if (s.startsWith("```")) {
            int first = s.indexOf('\n');
            int last = s.lastIndexOf("```");
            if (first >= 0 && last > first) {
                s = s.substring(first + 1, last).trim();
            }
        }
        if (s.toLowerCase().startsWith("json")) {
            s = s.substring(4).trim();
        }
        return s;
    }

    private Long asLong(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(o.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private int asInt(Object o) {
        if (o == null) return 0;
        if (o instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(o.toString());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private String asString(Object o) {
        return o == null ? null : o.toString();
    }

    private String asStringOr(Object o, String fallback) {
        String s = asString(o);
        return s == null ? fallback : s;
    }
}
