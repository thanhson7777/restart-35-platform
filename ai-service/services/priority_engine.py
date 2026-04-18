# -*- coding: utf-8 -*-
"""
Priority Engine Service
======================
Tính mức ưu tiên (priority level) cho user profile dựa trên:
- Risk score từ RiskPredictor
- Employment status (employed/unemployed)
- Duration of unemployment
- Barriers (health, family, techGap, location, language)

Chiến lược:
- Priority = Risk × (1 + Barrier_Score) × Employment_Factor × Time_Factor
- Càng nhiều rủi ro + rào cản + thất nghiệp → Priority càng cao

Usage:
    engine = PriorityEngine()
    priority = engine.calculate_priority(
        risk_score=0.65,
        barriers={'health': 1, 'family': 0, 'techGap': 0, 'location': 0, 'language': 0},
        employment_status='unemployed',
        months_unemployed=4
    )
"""

from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)


class PriorityEngine:
    """
    Tính priority level cho user profile.

    Priority Score = Risk × (1 + Barrier_Score) × Employment_Factor × Time_Factor

    Barrier_Score: 0.0 - 1.0 (số barriers / 5)
    Employment_Factor: 1.0 (employed) → 1.5+ (unemployed)
    Time_Factor: 1.0 (employed) → 1.0 + 0.05/tháng (unemployed)
    """

    # Ngưỡng priority level
    PRIORITY_THRESHOLDS = {
        'urgent': 0.70,
        'high': 0.50,
        'medium': 0.30,
        'low': 0.00
    }

    # Thời gian tối đa được coi là "ngắn"
    SHORT_TERM_MONTHS = 3
    MEDIUM_TERM_MONTHS = 6

    # Job types phù hợp cho từng mức priority
    JOB_TYPES_BY_PRIORITY = {
        'urgent': ['temporary', 'part-time', 'seasonal', 'contract'],
        'high': ['full-time', 'part-time', 'contract'],
        'medium': ['full-time', 'permanent', 'contract'],
        'low': ['full-time', 'permanent', 'freelance', 'contract']
    }

    # Message templates
    URGENCY_MESSAGES = {
        'urgent': 'Cần hành động NGAY - Tìm việc gấp trong tuần này',
        'high': 'Ưu tiên cao - Nên tìm việc trong tháng này',
        'medium': 'Ưu tiên trung bình - Có thể thăm dò cơ hội',
        'low': 'Ổn định - Có thời gian để lựa chọn kỹ'
    }

    def __init__(self):
        """Khởi tạo PriorityEngine."""
        logger.info("PriorityEngine initialized")

    def calculate_priority(
        self,
        risk_score: float,
        barriers: Dict[str, int],
        employment_status: str,
        months_unemployed: int = 0
    ) -> Dict[str, Any]:
        """
        Tính priority level cho user profile.

        Args:
            risk_score: Risk score từ RiskPredictor (0.0 - 1.0)
            barriers: Dict với các barrier flags
                {
                    'health': 0/1,
                    'family': 0/1,
                    'techGap': 0/1,
                    'location': 0/1,
                    'language': 0/1
                }
            employment_status: 'employed' | 'unemployed' | 'self-employed'
            months_unemployed: Số tháng thất nghiệp (nếu unemployed)

        Returns:
            Dict chứa priority level, score, urgency factors, recommended job types
        """
        # 1. Tính barrier score (0.0 - 1.0)
        barrier_score = self._calculate_barrier_score(barriers)

        # 2. Tính employment factor
        employment_factor = self._calculate_employment_factor(
            employment_status, months_unemployed
        )

        # 3. Tính time factor (dựa trên months unemployed)
        time_factor = self._calculate_time_factor(
            employment_status, months_unemployed
        )

        # 4. Tính priority score
        # Priority = Risk × (1 + Barrier_Score) × Employment_Factor × Time_Factor
        priority_score = (
            risk_score
            * (1 + barrier_score)
            * employment_factor
            * time_factor
        )

        # Cap at 1.0
        priority_score = min(1.0, priority_score)

        # 5. Map to level
        level = self._map_score_to_level(priority_score)

        # 6. Tính time horizon
        time_horizon = self._calculate_time_horizon(level, months_unemployed)

        # 7. Tạo urgency factors
        urgency_factors = self._generate_urgency_factors(
            risk_score=risk_score,
            barriers=barriers,
            employment_status=employment_status,
            months_unemployed=months_unemployed
        )

        # 8. Get recommended job types
        recommended_job_types = self.JOB_TYPES_BY_PRIORITY.get(level, [])

        # 9. Generate reasoning
        reasoning = self._generate_reasoning(
            level=level,
            risk_score=risk_score,
            barrier_score=barrier_score,
            employment_status=employment_status,
            months_unemployed=months_unemployed
        )

        result = {
            'level': level,
            'score': round(priority_score, 2),
            'time_horizon': time_horizon,
            'urgency_factors': urgency_factors,
            'recommended_job_types': recommended_job_types,
            'reasoning': reasoning,
            'metadata': {
                'risk_score': risk_score,
                'barrier_score': round(barrier_score, 2),
                'employment_factor': round(employment_factor, 2),
                'time_factor': round(time_factor, 2)
            }
        }

        logger.info(f"Priority calculated: level={level}, score={priority_score:.2f}")

        return result

    def _calculate_barrier_score(self, barriers: Dict[str, int]) -> float:
        """
        Tính barrier score (0.0 - 1.0).

        Mỗi barrier đếm 1 điểm, tối đa 5 barriers = 1.0
        """
        if not barriers:
            return 0.0

        total_barriers = sum(barriers.values())
        score = total_barriers / 5.0

        return min(1.0, score)

    def _calculate_employment_factor(
        self,
        employment_status: str,
        months_unemployed: int
    ) -> float:
        """
        Tính employment factor.

        - employed: 1.0
        - self-employed: 1.2 (có thu nhập nhưng không ổn định)
        - unemployed: 1.5 + bonus theo thời gian
        """
        status = employment_status.lower() if employment_status else 'unknown'

        if status == 'employed':
            return 1.0
        elif status == 'self-employed':
            return 1.2
        elif status == 'unemployed':
            # Base factor cộng với bonus theo tháng
            base = 1.5
            bonus = min(months_unemployed * 0.05, 0.5)  # Max 0.5 bonus
            return base + bonus
        else:
            return 1.0

    def _calculate_time_factor(
        self,
        employment_status: str,
        months_unemployed: int
    ) -> float:
        """
        Tính time factor.

        - employed: 1.0 (không cần gấp)
        - unemployed: tăng theo tháng (mỗi tháng +0.05, max 1.5)
        """
        status = employment_status.lower() if employment_status else 'unknown'

        if status == 'employed':
            return 1.0
        elif status == 'unemployed':
            # Mỗi tháng tăng 5%, cap at 1.5
            factor = 1.0 + (months_unemployed * 0.05)
            return min(1.5, factor)
        else:
            return 1.0

    def _map_score_to_level(self, score: float) -> str:
        """Map priority score sang level string."""
        if score >= self.PRIORITY_THRESHOLDS['urgent']:
            return 'urgent'
        elif score >= self.PRIORITY_THRESHOLDS['high']:
            return 'high'
        elif score >= self.PRIORITY_THRESHOLDS['medium']:
            return 'medium'
        else:
            return 'low'

    def _calculate_time_horizon(
        self,
        level: str,
        months_unemployed: int
    ) -> str:
        """
        Tính time horizon - khung thời gian hành động.

        Returns:
            'this_week' | 'this_month' | 'this_quarter' | 'this_year'
        """
        if level == 'urgent':
            return 'this_week'
        elif level == 'high':
            return 'this_month'
        elif level == 'medium':
            return 'this_quarter'
        else:
            return 'this_year'

    def _generate_urgency_factors(
        self,
        risk_score: float,
        barriers: Dict[str, int],
        employment_status: str,
        months_unemployed: int
    ) -> List[str]:
        """Tạo danh sách các yếu tố ảnh hưởng đến urgency."""
        factors = []

        # Risk-based factors
        if risk_score >= 0.7:
            factors.append("Rủi ro thất nghiệp CAO theo phân tích AI")
        elif risk_score >= 0.5:
            factors.append("Rủi ro thất nghiệp TRUNG BÌNH theo phân tích AI")
        elif risk_score >= 0.3:
            factors.append("Rủi ro thất nghiệp THẤP theo phân tích AI")

        # Employment-based factors
        status = employment_status.lower() if employment_status else 'unknown'

        if status == 'unemployed':
            if months_unemployed >= 6:
                factors.append(f"Thất nghiệp {months_unemployed} tháng - Cần hành động gấp")
            elif months_unemployed >= 3:
                factors.append(f"Thất nghiệp {months_unemployed} tháng - Nên tìm việc sớm")
            elif months_unemployed >= 1:
                factors.append(f"Thất nghiệp {months_unemployed} tháng - Cần tìm việc")
            else:
                factors.append("Đang trong giai đoạn tìm việc")
        elif status == 'self-employed':
            factors.append("Tự túc việc làm - Thu nhập có thể không ổn định")
        else:
            factors.append("Đang có việc làm ổn định")

        # Barrier-based factors
        barrier_labels = {
            'health': 'Có rào cản về sức khỏe',
            'family': 'Có rào cản về gia đình',
            'techGap': 'Có rào cản về kỹ năng số',
            'location': 'Có rào cản về địa lý',
            'language': 'Có rào cản về ngôn ngữ'
        }

        for barrier, value in barriers.items():
            if value == 1:
                label = barrier_labels.get(barrier, barrier)
                factors.append(label)

        return factors

    def _generate_reasoning(
        self,
        level: str,
        risk_score: float,
        barrier_score: float,
        employment_status: str,
        months_unemployed: int
    ) -> str:
        """Tạo reasoning text cho priority."""
        status = employment_status.lower() if employment_status else 'unknown'

        if level == 'urgent':
            if status == 'unemployed' and months_unemployed >= 4:
                return (
                    f"Rủi ro {risk_score:.0%} + thất nghiệp {months_unemployed} tháng + "
                    f"{int(barrier_score * 5)} rào cản → Cần hành động NGAY trong tuần này. "
                    f"Hệ thống sẽ ưu tiên gợi ý việc làm ngắn hạn và part-time."
                )
            else:
                return (
                    f"Rủi ro cao ({risk_score:.0%}) với nhiều rào cản. "
                    f"Cần tìm việc gấp trong tuần này."
                )

        elif level == 'high':
            return (
                f"Rủi ro trung bình-cao ({risk_score:.0%}) hoặc đang thất nghiệp. "
                f"Nên tập trung tìm việc trong tháng này."
            )

        elif level == 'medium':
            return (
                f"Rủi ro trung bình ({risk_score:.0%}) và có thể tìm việc cẩn thận hơn. "
                f"Hệ thống sẽ gợi ý cả việc ngắn và dài hạn."
            )

        else:
            return (
                f"Rủi ro thấp ({risk_score:.0%}) và đang có việc ổn định. "
                f"Có thời gian để khám phá các cơ hội tốt hơn."
            )


def main():
    """Test PriorityEngine với các trường hợp khác nhau."""
    engine = PriorityEngine()

    test_cases = [
        {
            'name': 'Thất nghiệp 5 tháng, rủi ro cao, 2 rào cản',
            'risk_score': 0.75,
            'barriers': {'health': 1, 'family': 1, 'techGap': 0, 'location': 0, 'language': 0},
            'employment_status': 'unemployed',
            'months_unemployed': 5
        },
        {
            'name': 'Đang có việc, rủi ro thấp, không rào cản',
            'risk_score': 0.25,
            'barriers': {'health': 0, 'family': 0, 'techGap': 0, 'location': 0, 'language': 0},
            'employment_status': 'employed',
            'months_unemployed': 0
        },
        {
            'name': 'Thất nghiệp 2 tháng, rủi ro trung bình, 1 rào cản',
            'risk_score': 0.55,
            'barriers': {'health': 0, 'family': 1, 'techGap': 0, 'location': 0, 'language': 0},
            'employment_status': 'unemployed',
            'months_unemployed': 2
        },
        {
            'name': 'Tự túc việc, rủi ro trung bình, 1 rào cản',
            'risk_score': 0.50,
            'barriers': {'health': 0, 'family': 0, 'techGap': 1, 'location': 0, 'language': 0},
            'employment_status': 'self-employed',
            'months_unemployed': 0
        }
    ]

    print("=== Testing PriorityEngine ===\n")

    for i, case in enumerate(test_cases, 1):
        print(f"Test {i}: {case['name']}")
        print("-" * 60)

        result = engine.calculate_priority(
            risk_score=case['risk_score'],
            barriers=case['barriers'],
            employment_status=case['employment_status'],
            months_unemployed=case['months_unemployed']
        )

        print(f"  Level: {result['level'].upper()}")
        print(f"  Score: {result['score']:.2f}")
        print(f"  Time Horizon: {result['time_horizon']}")
        print(f"  Recommended Job Types: {', '.join(result['recommended_job_types'])}")
        print(f"  Reasoning: {result['reasoning']}")
        print()

        if result['urgency_factors']:
            print(f"  Urgency Factors:")
            for f in result['urgency_factors']:
                print(f"    - {f}")
            print()


if __name__ == '__main__':
    main()
