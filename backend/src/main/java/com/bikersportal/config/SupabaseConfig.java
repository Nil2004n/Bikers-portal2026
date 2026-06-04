package com.bikersportal.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class SupabaseConfig {

    @Value("${spring.datasource.url}")
    private String dbUrl;

    @Value("${spring.datasource.username}")
    private String dbUsername;

    @Value("${spring.datasource.password}")
    private String dbPassword;

    @Value("${spring.datasource.driver-class-name:}")
    private String driverClassName;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(dbUrl);
        ds.setUsername(dbUsername);
        ds.setPassword(dbPassword);
        if (driverClassName != null && !driverClassName.isBlank()) {
            ds.setDriverClassName(driverClassName);
        } else if (dbUrl != null && dbUrl.startsWith("jdbc:postgresql:")) {
            ds.setDriverClassName("org.postgresql.Driver");
        } else if (dbUrl != null && dbUrl.startsWith("jdbc:h2:")) {
            ds.setDriverClassName("org.h2.Driver");
        }
        ds.setConnectionTimeout(30000);
        ds.setMaximumPoolSize(10);
        ds.setMinimumIdle(2);
        ds.setPoolName("BikersPortalHikariPool");
        return ds;
    }
}
