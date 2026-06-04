package com.bikersportal.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Base64;

@Service
@Slf4j
public class SupabaseStorageService {

    private final WebClient supabaseWebClient;
    private final String supabaseUrl;
    private final String bucket;

    public SupabaseStorageService(@Qualifier("supabaseWebClient") WebClient supabaseWebClient,
                                  @Qualifier("supabaseUrl") String supabaseUrl,
                                  @Qualifier("storageBucket") String bucket) {
        this.supabaseWebClient = supabaseWebClient;
        this.supabaseUrl = supabaseUrl;
        this.bucket = bucket;
    }

    @Value("${app.supabase-storage-bucket:bikers-portal}")
    private String bucketName;

    public String uploadBase64Image(String base64Data, String fileName, String mimeType) {
        byte[] imageBytes = Base64.getDecoder().decode(base64Data);

        supabaseWebClient.post()
                .uri("/storage/v1/object/" + bucket + "/" + fileName)
                .header("Content-Type", mimeType)
                .bodyValue(imageBytes)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(15))
                .onErrorResume(ex -> {
                    log.warn("Supabase upload failed for {}: {}", fileName, ex.getMessage());
                    return Mono.empty();
                })
                .block();

        return supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + fileName;
    }

    public void deleteFile(String fileName) {
        supabaseWebClient.delete()
                .uri("/storage/v1/object/" + bucket + "/" + fileName)
                .retrieve()
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(10))
                .onErrorComplete()
                .block();
    }

    public String generateFileName(String folder, String userId, String mimeType) {
        String ext = mimeType != null && mimeType.toLowerCase().contains("png") ? "png" : "jpg";
        return folder + "/" + userId + "-" + System.currentTimeMillis() + "." + ext;
    }

    public String getBucket() {
        return bucket;
    }
}
