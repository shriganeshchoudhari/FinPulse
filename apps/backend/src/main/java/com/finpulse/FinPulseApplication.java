package com.finpulse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.r2dbc.repository.config.EnableR2dbcRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

@SpringBootApplication
@EnableAsync
@EnableScheduling
@EnableR2dbcRepositories(basePackages = "com.finpulse", includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = R2dbcRepository.class), excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JpaRepository.class))
@EnableJpaRepositories(basePackages = "com.finpulse", includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JpaRepository.class), excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = R2dbcRepository.class))
public class FinPulseApplication {
    public static void main(String[] args) {
        // Optimize Netty for reactive performance
        System.setProperty("reactor.netty.ioWorkerCount", "8");
        SpringApplication.run(FinPulseApplication.class, args);
    }
}
