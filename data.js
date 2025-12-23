const appData = {
    "app_config": {
        "app_name": "AI 바른 글씨 튜터",
        "target_audience": "elementary_school_student",
        "theme": {
            "primary_color": "#FFD700",
            "font_family": "NanumGothic, casual",
            "tone_and_manner": "friendly, encouraging, gamified"
        }
    },
    "camera_guide": {
        "overlay_text": "네모 칸 안에 공책을 꽉 차게 맞춰주세요!",
        "error_messages": {
            "blur": "사진이 흔들렸어요. 카메라를 잠시 멈추고 다시 찍어볼까요?",
            "no_text": "글씨가 보이지 않아요. 조금 더 가까이서 찍어주세요.",
            "too_dark": "너무 어두워요. 밝은 곳에서 찍어볼까요?"
        }
    },
    "bad_handwriting_types": [
        {
            "id": 1,
            "type_name": "롤러코스터형",
            "detection_criteria": "글자의 기준선(Baseline)이 수평이 아니고 위아래로 심하게 변동됨.",
            "feedback_title": "글자가 춤을 추고 있어요! 💃",
            "feedback_detail": "글씨들이 줄 위에서 미끄럼틀을 타고 있네요. 공책의 밑줄에 엉덩이를 꾹 붙여서 써볼까요?",
            "correction_action": "줄 맞추기 연습"
        },
        {
            "id": 2,
            "type_name": "콩나물 시루형",
            "detection_criteria": "글자 간격(자간)이 0에 가깝거나 서로 겹침.",
            "feedback_title": "글자들이 너무 좁대요! 😫",
            "feedback_detail": "친구들이 너무 꽉 붙어 있어서 숨쉬기가 힘들대요. 글자 사이에 주먹 하나 들어갈 틈을 만들어주세요.",
            "correction_action": "자간 넓히기"
        },
        {
            "id": 3,
            "type_name": "태평양형",
            "detection_criteria": "자간이 띄어쓰기만큼 넓어 단어 구분이 안 됨.",
            "feedback_title": "이산가족이 되었네요! 📢",
            "feedback_detail": "글자들이 서로 너무 멀리 떨어져 있어요. 같은 단어 친구들은 손을 잡을 수 있게 가까이 붙여주세요.",
            "correction_action": "자간 좁히기"
        },
        {
            "id": 4,
            "type_name": "피사의 사탑형",
            "detection_criteria": "세로획의 기울기가 수직에서 15도 이상 벗어남.",
            "feedback_title": "글자가 넘어질 것 같아요! 🏗️",
            "feedback_detail": "글씨가 졸린가 봐요, 옆으로 눕고 싶어 하네요. 군인 아저씨처럼 차렷! 하고 똑바로 세워주세요.",
            "correction_action": "세로획 바르게 긋기"
        },
        {
            "id": 5,
            "type_name": "지렁이 'ㄹ'형",
            "detection_criteria": "자음의 획이 꺾이지 않고 곡선으로 이어짐 (특히 ㄹ, ㅁ).",
            "feedback_title": "지렁이가 기어가요! 🐛",
            "feedback_detail": "'ㄹ'을 한 번에 그리면 지렁이처럼 보여요. 'ㄱ'을 쓰고, 그 밑에 'ㄷ'을 쓴다는 느낌으로 딱! 딱! 끊어서 써보세요.",
            "correction_action": "획순 지키기"
        },
        {
            "id": 6,
            "type_name": "찌그러진 찐빵형",
            "detection_criteria": "폐곡선(ㅇ, ㅎ)이 닫히지 않거나 심하게 찌그러짐.",
            "feedback_title": "동그라미가 배고프대요! 🍩",
            "feedback_detail": "'ㅇ'이 찌그러졌어요. 동전처럼 동그랗고 예쁘게 굴려주세요. 시작한 곳과 끝나는 곳이 딱 만나야 해요!",
            "correction_action": "원형 바르게 그리기"
        },
        {
            "id": 7,
            "type_name": "대두형",
            "detection_criteria": "초성(자음)이 전체 글자 크기의 60% 이상 차지.",
            "feedback_title": "머리가 너무 커요! 👽",
            "feedback_detail": "첫 번째 자음이 욕심을 너무 부렸네요. 옆에 있는 모음 친구도 자리가 필요해요. 자음을 조금만 작게 줄여볼까요?",
            "correction_action": "자음 크기 줄이기"
        },
        {
            "id": 8,
            "type_name": "숏다리형",
            "detection_criteria": "모음의 세로획 길이가 자음 높이보다 짧음.",
            "feedback_title": "다리가 짧아 슬퍼요! 👖",
            "feedback_detail": "'아', '어'의 다리가 너무 짧아요. 자음 키만큼 길쭉하게 내려주세요. 그래야 글씨가 시원해 보여요.",
            "correction_action": "모음 길게 긋기"
        },
        {
            "id": 9,
            "type_name": "곁방살이 받침형",
            "detection_criteria": "받침의 중심이 초성+중성의 중심축에서 벗어남.",
            "feedback_title": "받침이 딴청을 피우네요! 🏠",
            "feedback_detail": "받침은 1층 가운데 방에 살아야 해요. 윗글자의 딱 정가운데 아래에 받침을 놓아주세요.",
            "correction_action": "받침 위치 교정"
        },
        {
            "id": 10,
            "type_name": "날림 공사형",
            "detection_criteria": "획의 끝부분이 흐릿하거나 끊어짐.",
            "feedback_title": "마무리가 약해요! 🍃",
            "feedback_detail": "글씨를 쓰다 말고 도망갔나요? 획의 끝까지 힘을 줘서 꾹 눌러 마무리해주세요.",
            "correction_action": "끝까지 꾹 눌러쓰기"
        }
    ],
    "good_handwriting_types": [
        {
            "id": 101,
            "type_name": "명필형",
            "is_good": true,
            "feedback_title": "와! 명필이네요! 🏆",
            "feedback_detail": "글씨가 정말 반듯하고 예뻐요. 마치 폰트로 인쇄한 것 같아요! 이대로만 계속 써주세요.",
            "correction_action": "참 잘했어요!"
        },
        {
            "id": 102,
            "type_name": "또박또박형",
            "is_good": true,
            "feedback_title": "정말 또박또박 잘 썼어요! 🌟",
            "feedback_detail": "한 글자 한 글자 정성을 다해 쓴 게 느껴져요. 선생님이 칭찬 도장을 쾅! 찍어줄게요.",
            "correction_action": "멋져요!"
        },
        {
            "id": 103,
            "type_name": "황금비율형",
            "is_good": true,
            "feedback_title": "글씨 균형이 완벽해요! ✨",
            "feedback_detail": "자음과 모음의 크기가 딱 적당하고 간격도 아주 좋아요. 글씨 쓰기 대장님이네요!",
            "correction_action": "최고예요!"
        }
    ]
};
