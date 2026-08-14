package com.ghostMessage;

import org.junit.jupiter.api.Test;

class GhostMessageApplicationTests {

	@Test
	void applicationClassLoads() {
		// Full @SpringBootTest requires external Postgres/Redis in CI.
		// Service-level behavior is covered by MessageServiceTest and UserServiceTest.
		GhostMessageApplication.class.getName();
	}

}
