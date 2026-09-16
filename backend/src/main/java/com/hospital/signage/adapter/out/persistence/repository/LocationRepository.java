package com.hospital.signage.adapter.out.persistence.repository;

import com.hospital.signage.adapter.out.persistence.entity.LocationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LocationRepository extends JpaRepository<LocationEntity, Long> {
    List<LocationEntity> findByParentId(Long parentId);
    boolean existsByParentId(Long parentId);
    boolean existsByLocationCodeAndHospitalId(String locationCode, Long hospitalId);

    @Query("SELECT l FROM LocationEntity l WHERE (:hospitalId IS NULL OR l.hospitalId = :hospitalId)")
    List<LocationEntity> findAllByHospital(@Param("hospitalId") Long hospitalId);

    @Query("SELECT l FROM LocationEntity l WHERE l.parent.id = :parentId AND (:hospitalId IS NULL OR l.hospitalId = :hospitalId)")
    List<LocationEntity> findByParentIdAndHospital(@Param("parentId") Long parentId, @Param("hospitalId") Long hospitalId);

    /**
     * Đổi tiền tố path cho toàn bộ nhánh con sau khi mã vị trí cha thay đổi.
     *
     * <p>Bắt buộc lọc theo hospitalId: mã vị trí chỉ duy nhất TRONG một bệnh viện (xem V20),
     * nên hai viện hoàn toàn có thể cùng có "TOA_A" và cùng path "TOA_A". Thiếu điều kiện này,
     * admin viện A đổi mã của mình sẽ ghi đè path các vị trí con của viện B — dữ liệu viện B
     * hỏng mà không ai biết. RLS cũng chặn được, nhưng RLS bị bỏ qua khi ứng dụng chạy bằng
     * tài khoản superuser nên tầng truy vấn phải tự lọc.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE LocationEntity l SET l.path = CONCAT(:newPath, SUBSTRING(l.path, LENGTH(:oldPath) + 1)) "
            + "WHERE l.path LIKE CONCAT(:oldPath, '.%') AND l.hospitalId = :hospitalId")
    void bulkUpdatePathPrefix(@Param("oldPath") String oldPath, @Param("newPath") String newPath,
            @Param("hospitalId") Long hospitalId);

    long countByHospitalId(Long hospitalId);
    long countByParentId(Long parentId);
}
