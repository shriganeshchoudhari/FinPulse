package com.finpulse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.r2dbc.repository.config.EnableR2dbcRepositories;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
@EnableR2dbcRepositories(basePackages = "com.finpulse")
public class FinPulseApplication {
    public static void main(String[] args) {
        // Optimize Netty for reactive performance
        System.setProperty("reactor.netty.ioWorkerCount", "8");
        SpringApplication.run(FinPulseApplication.class, args);
    }
}
