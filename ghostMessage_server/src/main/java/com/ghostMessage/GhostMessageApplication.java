package com.ghostMessage;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication 
public class GhostMessageApplication {
	
	@Bean // 스프링이 관리하는 객체로 등록
	public CommandLineRunner testDbConnection(javax.sql.DataSource dataSource) { // db 연결 객체 생성
		
	    // CommandLineRunner -> 스프링부트 실행 시 자동 실행됨
	    return args -> {
	        try (java.sql.Connection conn = dataSource.getConnection()) {
	            System.out.println("------------------------------------------");
	            System.out.println("✅ DB Connection Success! URL: " + conn.getMetaData().getURL());
	            System.out.println("------------------------------------------");
	            
	        } catch (Exception e) {
	            System.err.println("------------------------------------------");
	            System.err.println("❌ DB Connection Failed! Check your settings: " + e.getMessage());
	            System.err.println("------------------------------------------");
	        }
	    };
	}

	public static void main(String[] args) {
		
		// 스프링 어플리케이션 시작 (Test trigger)
		SpringApplication.run(GhostMessageApplication.class, args);
	}

}
