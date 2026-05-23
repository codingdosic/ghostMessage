package com.ghostMessage.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import com.ghostMessage.domain.User;

public interface UserRepository extends JpaRepository<User, UUID>{

}
