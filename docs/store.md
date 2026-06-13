작성 목록
- 익스텐션 코드 수정 및 반영 순서 정리
- 도커 환경의 백엔드 코드 수정 및 반영 순서 정리
- 서버 이용자 현황 확인 방법
- 그 외 서버를 통해 운영하는 과정에서 생길 수 있는 상황과 그에 대한 행동 가이드

- 작성 전 현재 운영중인 도커 환경의 현황을 완벽히 이해할 수 있도록 서버 명령어를 이 아래에 작성하면, 해당 명령어의 실행 후 출력을 이 문서에 기입할 예정. 이후 출력을 참고하여 위 작성 목록을 만들면 됨.

### 서버 환경 진단 명령어
운영 환경 파악을 위해 `ghostMessage_server` 디렉토리에서 다음 명령어들을 순차적으로 실행해 주세요.

1. 컨테이너 상태 및 포트 확인
   `docker-compose ps`

2. 컨테이너별 실시간 자원 사용량 (CPU, 메모리)
   `docker stats --no-stream`

3. 최근 서버 로그 100줄 확인 (오류 탐색)
   `docker-compose logs --tail=100 app`

4. PostgreSQL 데이터베이스 연결 및 테이블 목록 확인 (DB 스키마 파악)
   `docker-compose exec db psql -U ghost_user -d ghost_db -c "\dt"`

5. Redis 연결 상태 확인 (캐시 상태 파악)
   `docker-compose exec redis redis-cli info memory`




   ubuntu@ghost-vnic:~/app/ghostMessage_server$ docker compose ps
WARN[0000] /home/ubuntu/app/ghostMessage_server/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion
NAME            IMAGE                           COMMAND                  SERVICE   CREATED        STATUS        PORTS
ghost-app       ghostmessage_server-app         "java -jar app.jar"      app       19 hours ago   Up 19 hours   8080/tcp
ghost-db        postgres:15-alpine              "docker-entrypoint.s…"   db        19 hours ago   Up 19 hours   5432/tcp
ghost-pgadmin   dpage/pgadmin4:8.8              "/entrypoint.sh"         pgadmin   19 hours ago   Up 19 hours   443/tcp, 0.0.0.0:5050->80/tcp, [::]:5050->80/tcp
ghost-redis     redis:7-alpine                  "docker-entrypoint.s…"   redis     19 hours ago   Up 19 hours   6379/tcp
ghost-tunnel    cloudflare/cloudflared:latest   "cloudflared --no-au…"   tunnel    19 hours ago   Up 19 hours


ubuntu@ghost-vnic:~/app/ghostMessage_server$ docker stats --no-stream
CONTAINER ID   NAME            CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
3767e1cda51f   ghost-tunnel    0.29%     35.24MiB / 956.6MiB   3.68%     25.6MB / 37.5MB   148MB / 22MB      8
d734413dcf79   ghost-app       0.15%     106.9MiB / 512MiB     20.89%    3.77MB / 3.55MB   422MB / 361MB     35
bd3f4775036e   ghost-db        0.00%     41.14MiB / 256MiB     16.07%    1.61MB / 1.26MB   172MB / 47.5MB    16
abc4135876ce   ghost-redis     0.55%     5.473MiB / 128MiB     4.28%     623kB / 683kB     34.2MB / 6.12MB   6
282c16fb6769   ghost-pgadmin   0.03%     20.11MiB / 956.6MiB   2.10%     60.4kB / 221kB    331MB / 210MB     9

ubuntu@ghost-vnic:~/app/ghostMessage_server$ docker compose logs app
WARN[0000] /home/ubuntu/app/ghostMessage_server/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion
ghost-app  |
ghost-app  |   .   ____          _            __ _ _
ghost-app  |  /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
ghost-app  | ( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
ghost-app  |  \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
ghost-app  |   '  |____| .__|_| |_|_| |_\__, | / / / /
ghost-app  |  =========|_|==============|___/=/_/_/_/
ghost-app  |
ghost-app  |  :: Spring Boot ::                (v4.0.6)
ghost-app  |
ghost-app  | 2026-05-30T12:14:12.824Z  INFO 1 --- [ghostMessage] [           main] c.ghostMessage.GhostMessageApplication   : Starting GhostMessageApplication v0.0.1-SNAPSHOT using Java 17.0.19 with PID 1 (/app/app.jar started by root in /app)
ghost-app  | 2026-05-30T12:14:12.916Z  INFO 1 --- [ghostMessage] [           main] c.ghostMessage.GhostMessageApplication   : No active profile set, falling back to 1 default profile: "default"
ghost-app  | 2026-05-30T12:14:29.916Z  INFO 1 --- [ghostMessage] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Multiple Spring Data modules found, entering strict repository configuration mode
ghost-app  | 2026-05-30T12:14:29.921Z  INFO 1 --- [ghostMessage] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Bootstrapping Spring Data JPA repositories in DEFAULT mode.
ghost-app  | 2026-05-30T12:14:33.325Z  INFO 1 --- [ghostMessage] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Finished Spring Data repository scanning in 3292 ms. Found 3 JPA repository interfaces.
ghost-app  | 2026-05-30T12:14:34.611Z  INFO 1 --- [ghostMessage] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Multiple Spring Data modules found, entering strict repository configuration mode
ghost-app  | 2026-05-30T12:14:34.617Z  INFO 1 --- [ghostMessage] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Bootstrapping Spring Data Redis repositories in DEFAULT mode.
ghost-app  | 2026-05-30T12:14:34.917Z  INFO 1 --- [ghostMessage] [           main] .RepositoryConfigurationExtensionSupport : Spring Data Redis - Could not safely identify store assignment for repository candidate interface com.ghostMessage.repository.MessageRepository; If you want this repository to be a Redis repository, consider annotating your entities with one of these annotations: org.springframework.data.redis.core.RedisHash (preferred), or consider extending one of the following types with your repository: org.springframework.data.keyvalue.repository.KeyValueRepository
ghost-app  | 2026-05-30T12:14:34.919Z  INFO 1 --- [ghostMessage] [           main] .RepositoryConfigurationExtensionSupport : Spring Data Redis - Could not safely identify store assignment for repository candidate interface com.ghostMessage.repository.UserRepository; If you want this repository to be a Redis repository, consider annotating your entities with one of these annotations: org.springframework.data.redis.core.RedisHash (preferred), or consider extending one of the following types with your repository: org.springframework.data.keyvalue.repository.KeyValueRepository
ghost-app  | 2026-05-30T12:14:34.922Z  INFO 1 --- [ghostMessage] [           main] .RepositoryConfigurationExtensionSupport : Spring Data Redis - Could not safely identify store assignment for repository candidate interface com.ghostMessage.repository.VoteRepository; If you want this repository to be a Redis repository, consider annotating your entities with one of these annotations: org.springframework.data.redis.core.RedisHash (preferred), or consider extending one of the following types with your repository: org.springframework.data.keyvalue.repository.KeyValueRepository
ghost-app  | 2026-05-30T12:14:34.923Z  INFO 1 --- [ghostMessage] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Finished Spring Data repository scanning in 105 ms. Found 0 Redis repository interfaces.
ghost-app  | 2026-05-30T12:14:47.612Z  INFO 1 --- [ghostMessage] [           main] o.s.boot.tomcat.TomcatWebServer          : Tomcat initialized with port 8080 (http)
ghost-app  | 2026-05-30T12:14:48.029Z  INFO 1 --- [ghostMessage] [           main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]
ghost-app  | 2026-05-30T12:14:48.030Z  INFO 1 --- [ghostMessage] [           main] o.apache.catalina.core.StandardEngine    : Starting Servlet engine: [Apache Tomcat/11.0.21]
ghost-app  | 2026-05-30T12:14:49.121Z  INFO 1 --- [ghostMessage] [           main] b.w.c.s.WebApplicationContextInitializer : Root WebApplicationContext: initialization completed in 34799 ms
ghost-app  | 2026-05-30T12:14:52.331Z  INFO 1 --- [ghostMessage] [           main] org.hibernate.orm.jpa                    : HHH008540: Processing PersistenceUnitInfo [name: default]
ghost-app  | 2026-05-30T12:14:53.634Z  INFO 1 --- [ghostMessage] [           main] org.hibernate.orm.core                   : HHH000001: Hibernate ORM core version 7.2.12.Final
ghost-app  | 2026-05-30T12:15:04.031Z  INFO 1 --- [ghostMessage] [           main] o.s.o.j.p.SpringPersistenceUnitInfo      : No LoadTimeWeaver setup: ignoring JPA class transformer
ghost-app  | 2026-05-30T12:15:05.225Z  INFO 1 --- [ghostMessage] [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Starting...
ghost-app  | 2026-05-30T12:15:09.522Z  INFO 1 --- [ghostMessage] [           main] com.zaxxer.hikari.pool.HikariPool        : HikariPool-1 - Added connection org.postgresql.jdbc.PgConnection@424a152f
ghost-app  | 2026-05-30T12:15:09.531Z  INFO 1 --- [ghostMessage] [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Start completed.
ghost-app  | 2026-05-30T12:15:10.415Z  WARN 1 --- [ghostMessage] [           main] org.hibernate.orm.deprecation            : HHH90000025: PostgreSQLDialect does not need to be specified explicitly using 'hibernate.dialect' (remove the property setting and it will be selected by default)
ghost-app  | 2026-05-30T12:15:11.415Z  INFO 1 --- [ghostMessage] [           main] org.hibernate.orm.connections.pooling    : HHH10001005: Database info:
ghost-app  |    Database JDBC URL [jdbc:postgresql://db:5432/ghost_db]
ghost-app  |    Database driver: PostgreSQL JDBC Driver
ghost-app  |    Database dialect: PostgreSQLDialect
ghost-app  |    Database version: 15.18
ghost-app  |    Default catalog/schema: ghost_db/public
ghost-app  |    Autocommit mode: undefined/unknown
ghost-app  |    Isolation level: READ_COMMITTED [default READ_COMMITTED]
ghost-app  |    JDBC fetch size: none
ghost-app  |    Pool: DataSourceConnectionProvider
ghost-app  |    Minimum pool size: undefined/unknown
ghost-app  |    Maximum pool size: undefined/unknown
ghost-app  | 2026-05-30T12:15:36.207Z  INFO 1 --- [ghostMessage] [           main] org.hibernate.orm.core                   : HHH000489: No JTA platform available (set 'hibernate.transaction.jta.platform' to enable JTA platform integration)
ghost-app  | 2026-05-30T12:15:37.724Z  INFO 1 --- [ghostMessage] [           main] j.LocalContainerEntityManagerFactoryBean : Initialized JPA EntityManagerFactory for persistence unit 'default'
ghost-app  | 2026-05-30T12:15:41.320Z  INFO 1 --- [ghostMessage] [           main] o.s.d.j.r.query.QueryEnhancerFactories   : Hibernate is in classpath; If applicable, HQL parser will be used.
ghost-app  | 2026-05-30T12:16:08.618Z  WARN 1 --- [ghostMessage] [           main] JpaBaseConfiguration$JpaWebConfiguration : spring.jpa.open-in-view is enabled by default. Therefore, database queries may be performed during view rendering. Explicitly configure spring.jpa.open-in-view to disable this warning
ghost-app  | 2026-05-30T12:16:22.907Z  INFO 1 --- [ghostMessage] [           main] o.s.boot.tomcat.TomcatWebServer          : Tomcat started on port 8080 (http) with context path '/'
ghost-app  | 2026-05-30T12:16:23.109Z  INFO 1 --- [ghostMessage] [           main] c.ghostMessage.GhostMessageApplication   : Started GhostMessageApplication in 140.379 seconds (process running for 155.196)
ghost-app  | ------------------------------------------
ghost-app  | ✅ DB Connection Success! URL: jdbc:postgresql://db:5432/ghost_db
ghost-app  | ------------------------------------------
ghost-app  | 2026-05-30T12:16:27.407Z  INFO 1 --- [ghostMessage] [nio-8080-exec-1] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring DispatcherServlet 'dispatcherServlet'
ghost-app  | 2026-05-30T12:16:27.407Z  INFO 1 --- [ghostMessage] [nio-8080-exec-1] o.s.web.servlet.DispatcherServlet        : Initializing Servlet 'dispatcherServlet'
ghost-app  | 2026-05-30T12:16:27.414Z  INFO 1 --- [ghostMessage] [nio-8080-exec-1] o.s.web.servlet.DispatcherServlet        : Completed initialization in 6 ms
ghost-app  | Hibernate:
ghost-app  |     select
ghost-app  |         m1_0.id,
ghost-app  |         m1_0.anchor_key,
ghost-app  |         m1_0.author_id,
ghost-app  |         m1_0.content,
ghost-app  |         m1_0.created_at,
ghost-app  |         m1_0.down_vote_score,
ghost-app  |         m1_0.img_src,
ghost-app  |         m1_0.link_text,
ghost-app  |         m1_0.page_url,
ghost-app  |         m1_0.selector,
ghost-app  |         m1_0.type,
ghost-app  |         m1_0.up_vote_score
ghost-app  |     from
ghost-app  |         message m1_0
ghost-app  |     where
ghost-app  |         m1_0.page_url=?
ghost-app  | Hibernate:
ghost-app  |     select
ghost-app  |         m1_0.id,
ghost-app  |         m1_0.anchor_key,
ghost-app  |         m1_0.author_id,
ghost-app  |         m1_0.content,
ghost-app  |         m1_0.created_at,
ghost-app  |         m1_0.down_vote_score,
ghost-app  |         m1_0.img_src,
ghost-app  |         m1_0.link_text,
ghost-app  |         m1_0.page_url,
ghost-app  |         m1_0.selector,
ghost-app  |         m1_0.type,
ghost-app  |         m1_0.up_vote_score
ghost-app  |     from
ghost-app  |         message m1_0
ghost-app  |     where
ghost-app  |         m1_0.page_url=?
ghost-app  | Hibernate:
ghost-app  |     select
ghost-app  |         m1_0.id,
ghost-app  |         m1_0.anchor_key,
ghost-app  |         m1_0.author_id,
ghost-app  |         m1_0.content,
ghost-app  |         m1_0.created_at,
ghost-app  |         m1_0.down_vote_score,
ghost-app  |         m1_0.img_src,
ghost-app  |         m1_0.link_text,
ghost-app  |         m1_0.page_url,
ghost-app  |         m1_0.selector,
ghost-app  |         m1_0.type,
ghost-app  |         m1_0.up_vote_score
ghost-app  |     from
ghost-app  |         message m1_0
ghost-app  |     where
ghost-app  |         m1_0.page_url=?



ubuntu@ghost-vnic:~/app/ghostMessage_server$ docker compose exec db psql -U ghost_user -d ghost_db -c "\dt"
WARN[0000] /home/ubuntu/app/ghostMessage_server/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion
           List of relations
 Schema |  Name   | Type  |   Owner
--------+---------+-------+------------
 public | message | table | ghost_user
 public | users   | table | ghost_user
 public | votes   | table | ghost_user
(3 rows)


ubuntu@ghost-vnic:~/app/ghostMessage_server$ docker compose exec redis redis-cli info memory
WARN[0000] /home/ubuntu/app/ghostMessage_server/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion
# Memory
used_memory:1162520
used_memory_human:1.11M
used_memory_rss:2228224
used_memory_rss_human:2.12M
used_memory_peak:1168824
used_memory_peak_human:1.11M
used_memory_peak_perc:99.46%
used_memory_overhead:974696
used_memory_startup:948528
used_memory_dataset:187824
used_memory_dataset_perc:87.77%
allocator_allocated:1709104
allocator_active:2052096
allocator_resident:4984832
allocator_muzzy:0
total_system_memory:1003114496
total_system_memory_human:956.64M
used_memory_lua:32768
used_memory_vm_eval:32768
used_memory_lua_human:32.00K
used_memory_scripts_eval:0
number_of_cached_scripts:0
number_of_functions:0
number_of_libraries:0
used_memory_vm_functions:33792
used_memory_vm_total:66560
used_memory_vm_total_human:65.00K
used_memory_functions:192
used_memory_scripts:192
used_memory_scripts_human:192B
maxmemory:67108864
maxmemory_human:64.00M
maxmemory_policy:allkeys-lru
allocator_frag_ratio:1.22
allocator_frag_bytes:266960
allocator_rss_ratio:2.43
allocator_rss_bytes:2932736
rss_overhead_ratio:0.45
rss_overhead_bytes:-2756608
mem_fragmentation_ratio:1.98
mem_fragmentation_bytes:1104096
mem_not_counted_for_evict:896
mem_replication_backlog:0
mem_total_replication_buffers:0
mem_clients_slaves:0
mem_clients_normal:24328
mem_cluster_links:0
mem_aof_buffer:896
mem_allocator:jemalloc-5.3.0
mem_overhead_db_hashtable_rehashing:0
active_defrag_running:0
lazyfree_pending_objects:0
lazyfreed_objects:0