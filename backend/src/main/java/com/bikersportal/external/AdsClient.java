package com.bikersportal.external;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

@Component
@Slf4j
public class AdsClient {

    private final WebClient webClient;

    public AdsClient(WebClient.Builder builder,
                     @Value("${external.ads-url:https://mock-ads.example.com}") String adsUrl) {
        this.webClient = builder.baseUrl(adsUrl).build();
    }

    public Mono<List<AdDTO>> fetchAds(String context) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder.path("/ads").queryParam("context", context).build())
                .retrieve()
                .bodyToFlux(AdDTO.class)
                .collectList()
                .timeout(Duration.ofSeconds(5))
                .onErrorResume(ex -> {
                    log.debug("Ads service unreachable ({}), returning empty list", ex.getMessage());
                    return Mono.just(List.of());
                });
    }
}
