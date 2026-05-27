package com.finpulse.backend.domain.repository;

import com.finpulse.backend.domain.model.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.List;

public interface LedgerRepository extends JpaRepository<LedgerEntry, UUID> {
    List<LedgerEntry> findByUserId(UUID userId);
}
