package com.ghostMessage.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import com.ghostMessage.domain.User;

public interface UserRepository extends JpaRepository<User, UUID>{

    List<User> findByUuidIn(Collection<UUID> uuids);
}
