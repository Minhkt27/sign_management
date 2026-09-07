package com.hospital.signage.infrastructure.config;

import com.hospital.signage.infrastructure.security.HospitalContext;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DelegatingDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

/**
 * Nạp bệnh viện của luồng hiện tại vào biến phiên {@code app.hospital_id} cho mọi kết nối
 * lấy ra từ pool. Đây là cầu nối giữa {@link HospitalContext} (phía Java) và các policy RLS
 * (phía database, xem migration V22).
 *
 * <p>Đặt ở tầng lấy kết nối chứ không phải ở tầng transaction, vì đây là nơi duy nhất chắc
 * chắn mọi truy vấn đều đi qua — kể cả truy vấn ngoài transaction, kể cả code sau này chưa
 * viết. Bọc bằng {@link BeanPostProcessor} để giữ nguyên toàn bộ cấu hình Hikari mà Spring
 * Boot đã dựng sẵn từ application.yml.
 */
@Configuration
public class RlsDataSourceConfig {

    @Bean
    public static BeanPostProcessor rlsDataSourceWrapper() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
                if (bean instanceof DataSource dataSource && !(bean instanceof RlsDataSource)) {
                    return new RlsDataSource(dataSource);
                }
                return bean;
            }
        };
    }

    static class RlsDataSource extends DelegatingDataSource {

        RlsDataSource(DataSource targetDataSource) {
            super(targetDataSource);
        }

        @Override
        public Connection getConnection() throws SQLException {
            return applyHospitalContext(super.getConnection());
        }

        @Override
        public Connection getConnection(String username, String password) throws SQLException {
            return applyHospitalContext(super.getConnection(username, password));
        }

        /**
         * Luôn ghi giá trị, kể cả khi context rỗng.
         *
         * <p>Kết nối được tái sử dụng qua pool, nên nếu chỉ ghi khi có context thì một request
         * không khai báo bệnh viện sẽ thừa hưởng giá trị còn sót của request trước — nghĩa là
         * đọc được dữ liệu của viện khác, đúng thứ RLS sinh ra để chặn. Ghi chuỗi rỗng cho
         * trạng thái "chưa khai báo" để policy xử theo nhánh fail-closed.
         */
        private Connection applyHospitalContext(Connection connection) throws SQLException {
            String value = HospitalContext.current();
            try (PreparedStatement statement =
                         connection.prepareStatement("SELECT set_config('app.hospital_id', ?, false)")) {
                statement.setString(1, value == null ? "" : value);
                statement.execute();
            } catch (SQLException e) {
                // Không nuốt lỗi: kết nối không khai báo được bệnh viện là kết nối không an
                // toàn để dùng tiếp. Trả nó về pool rồi ném lên trên.
                connection.close();
                throw e;
            }
            return connection;
        }
    }
}
