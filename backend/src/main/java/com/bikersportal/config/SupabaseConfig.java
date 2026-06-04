package com.bikersportal.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class SupabaseConfig {

    @Value("${app.supabase-url}")
    private String supabaseUrl;

    @Value("${app.supabase-service-role-key}")
    private String serviceRoleKey;

    @Value("${app.supabase-storage-bucket}")
    private String storageBucket;

    @Bean(name = "supabaseWebClient")
    public WebClient supabaseWebClient() {
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(c -> c.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();

        return WebClient.builder()
                .baseUrl(supabaseUrl)
                .defaultHeader("apikey", serviceRoleKey)
                .defaultHeader("Authorization", "Bearer " + serviceRoleKey)
                .defaultHeader("Content-Type", "application/json")
                .exchangeStrategies(strategies)
                .build();
    }

    @Bean(name = "supabaseUrl")
    public String supabaseUrl() {
        return supabaseUrl;
    }

    @Bean(name = "serviceRoleKey")
    public String serviceRoleKey() {
        return serviceRoleKey;
    }

    @Bean(name = "storageBucket")
    public String storageBucket() {
        return storageBucket;
    }
}
