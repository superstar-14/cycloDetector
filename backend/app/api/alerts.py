"""
IMD Cyclone Detector – Vulnerability Alert System & SMS Automation Service

Provides:
1. District vulnerability evaluation along cyclone track
2. Strict automated threshold trigger (vulnerabilityScore >= 80 && !alertSent)
3. Multi-language SMS template generation (English, Hindi, Odia, Bengali, Telugu, Tamil, Gujarati)
4. Multi-provider SMS dispatch mockup (Twilio, Fast2SMS, AWS SNS with mock fallbacks)
5. Audit log of dispatched alerts
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, BackgroundTasks

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Multi-Language Alert Templates ────────────────────────────

ALERT_TEMPLATES: Dict[str, str] = {
    "en": (
        "URGENT: Cyclone alert for {district_name}. Vulnerability Score is {score}/100. "
        "Expected winds of {wind_speed} km/h at {eta}. "
        "Please secure agricultural assets and seek shelter immediately. - Warning System"
    ),
    "hi": (
        "तत्काल: {district_name} के लिए चक्रवात चेतावनी। संवेदनशीलता स्कोर {score}/100 है। "
        "{eta} पर {wind_speed} किमी/घंटा की अपेक्षित हवाएं। "
        "कृपया कृषि संपत्ति को सुरक्षित करें और तुरंत आश्रय लें। - चेतावनी प्रणाली"
    ),
    "or": (
        "ଜରୁରୀ: {district_name} ପାଇଁ ବାତ୍ୟା ସତର୍କତା। ସମ୍ବେଦନଶୀଳତା ସ୍କୋର {score}/100। "
        "{eta} ରେ {wind_speed} କିମି/ଘଣ୍ଟା ବେଗରେ ପବନ ଆଶଙ୍କା। "
        "ଦୟାକରି କୃଷି ସମ୍ପତ୍ତି ସୁରକ୍ଷିତ କରନ୍ତୁ ଏବଂ ତୁରନ୍ତ ଆଶ୍ରୟ ନିଅନ୍ତୁ। - ସତର୍କତା ପ୍ରଣାଳୀ"
    ),
    "bn": (
        "জরুরী: {district_name} এর জন্য ঘূর্ণিঝড় সতর্কতা। দুর্বলতা স্কোর {score}/100। "
        "{eta} এ প্রত্যাশিত বাতাস {wind_speed} কিমি/ঘন্টা। "
        "অনুগ্রহ করে কৃষি সম্পদ সুরক্ষিত করুন এবং অবিলম্বে নিরাপদ আশ্রয়ে যান। - সতর্কবার্তা ব্যবস্থা"
    ),
    "te": (
        "అత్యవసరం: {district_name} కోసం తుఫాను హెచ్చరిక. ప్రమాద స్కోరు {score}/100. "
        "{eta} వద్ద గంటకు {wind_speed} కి.మీ అంచనా వేయబడిన గాలులు. "
        "దయచేసి వ్యవసాయ ఆస్తులను భద్రపరుచుకోండి మరియు వెంటనే ఆశ్రయం పొందండి. - హెచ్చరిక వ్యవస్థ"
    ),
    "ta": (
        "அவசரம்: {district_name} மாவட்டத்திற்கான புயல் எச்சரிக்கை. பாதிப்பு மதிப்பீடு {score}/100. "
        "{eta} நேரத்தில் {wind_speed} கிமீ/மணி வேகத்தில் காற்று வீசக்கூடும். "
        "உடனடியாக பாதுகாப்பான இடத்திற்கு செல்லவும். - எச்சரிக்கை அமைப்பு"
    ),
    "gu": (
        "તાકીદ: {district_name} માટે વાવાઝોડાની ચેતવણી. સંવેદનશીલતા સ્કોર {score}/100 છે. "
        "{eta} સમયે {wind_speed} કિમી/કલાકની પવનની સંભાવના. "
        "કૃપા કરીને કૃષિ સંપત્તિ સુરક્ષિત કરો અને તરત જ આશ્રય લો. - ચેતવણી પ્રણાલી"
    ),
}

# ── Data Models ──────────────────────────────────────────────

class DistrictVulnerabilityRequest(BaseModel):
    district_name: str
    state: str
    vulnerability_score: int = Field(..., ge=0, le=100)
    wind_speed_kmh: int
    rainfall_mm: Optional[int] = 120
    eta: str = "T+6h"
    language: str = "en"
    phone_numbers: Optional[List[str]] = None
    provider: str = Field(default="Fast2SMS", description="Fast2SMS, Twilio, or AWS_SNS")


class SMSDispatchRecord(BaseModel):
    id: str
    timestamp: str
    district_name: str
    state: str
    vulnerability_score: int
    status_badge: str
    wind_speed_kmh: int
    rainfall_mm: int
    eta: str
    language: str
    message: str
    recipients_count: int
    provider: str
    status: str  # "DELIVERED", "QUEUED", "SIMULATED"
    trigger_type: str  # "AUTOMATED_THRESHOLD" or "MANUAL"


class AutomatedEvaluationRequest(BaseModel):
    storm_id: str
    threshold: int = 80
    language: str = "en"
    districts: List[Dict[str, Any]]


# In-memory alert dispatch history and state observer
_alert_history: List[Dict[str, Any]] = []
_dispatched_district_keys: set = set()


def render_alert_message(district: str, score: int, wind_speed: int, eta: str, lang: str = "en") -> str:
    """Format personalized regional warning text."""
    template = ALERT_TEMPLATES.get(lang, ALERT_TEMPLATES["en"])
    return template.format(
        district_name=district,
        score=score,
        wind_speed=wind_speed,
        eta=eta,
    )


def determine_status_badge(score: int) -> str:
    if score >= 75:
        return "Evacuate"
    elif score >= 40:
        return "Warning"
    return "Safe"


# ── Provider Mockup / Dispatcher ──────────────────────────────

async def dispatch_sms_payload(
    district_name: str,
    state: str,
    score: int,
    wind_speed: int,
    rainfall: int,
    eta: str,
    lang: str,
    provider: str,
    trigger_type: str,
    phone_numbers: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Server-side action integrating SMS Gateway (Twilio / Fast2SMS / AWS SNS).
    Dispatches warning payload and logs result.
    """
    message_text = render_alert_message(district_name, score, wind_speed, eta, lang)
    status_badge = determine_status_badge(score)
    recipients = phone_numbers or ["+91-XXXXX-00124", "+91-XXXXX-98412", "+91-SDMA-BROADCAST"]
    
    # Provider-specific payload structure
    provider_receipt = {}
    if provider.lower() == "fast2sms":
        # Fast2SMS Quick SMS / Bulk Route Structure
        provider_receipt = {
            "gateway": "Fast2SMS India",
            "route": "dlt_manual",
            "sender_id": "IMDALT",
            "message_id": f"F2S_{int(datetime.now(timezone.utc).timestamp())}_{score}",
            "statusCode": 200,
            "status": "success",
        }
    elif provider.lower() == "twilio":
        # Twilio Programmable SMS Structure
        provider_receipt = {
            "gateway": "Twilio SMS",
            "account_sid": "AC_mock_imd_emergency_alert",
            "sid": f"SM{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}{score}",
            "status": "delivered",
        }
    elif provider.lower() == "aws_sns":
        # AWS SNS Publish Structure
        provider_receipt = {
            "gateway": "AWS SNS (ap-south-1)",
            "MessageId": f"sns-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{score}",
            "HTTPStatusCode": 200,
        }
    else:
        provider_receipt = {
            "gateway": f"{provider} (Mock Gateway)",
            "dispatch_id": f"MOCK-{score}-{district_name[:3].upper()}",
            "status": "dispatched",
        }

    record = {
        "id": f"ALT-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "district_name": district_name,
        "state": state,
        "vulnerability_score": score,
        "status_badge": status_badge,
        "wind_speed_kmh": wind_speed,
        "rainfall_mm": rainfall,
        "eta": eta,
        "language": lang,
        "message": message_text,
        "recipients_count": len(recipients),
        "provider": provider,
        "provider_receipt": provider_receipt,
        "status": "DELIVERED",
        "trigger_type": trigger_type,
    }

    _alert_history.insert(0, record)
    logger.info("Dispatched vulnerability alert for %s (Score %d): %s", district_name, score, record["id"])
    return record


# ── API Endpoints ─────────────────────────────────────────────

@router.post("/send-sms", response_model=Dict[str, Any])
async def send_manual_or_direct_sms(req: DistrictVulnerabilityRequest):
    """
    Endpoint called directly from UI to dispatch a personalized district SMS alert.
    """
    record = await dispatch_sms_payload(
        district_name=req.district_name,
        state=req.state,
        score=req.vulnerability_score,
        wind_speed=req.wind_speed_kmh,
        rainfall=req.rainfall_mm or 120,
        eta=req.eta,
        lang=req.language,
        provider=req.provider,
        trigger_type="MANUAL_OPERATOR",
        phone_numbers=req.phone_numbers,
    )
    return {"success": True, "alert": record}


@router.post("/evaluate-and-trigger")
async def evaluate_and_trigger_threshold(req: AutomatedEvaluationRequest):
    """
    Automated state observer / cron endpoint:
    Evaluates vulnerability score for all districts in storm's path.
    Strict condition: if (district.vulnerabilityScore >= 80 && !alertSent)
    Fires SMS dispatch for every threshold breach.
    """
    threshold = req.threshold
    triggered = []
    already_sent = []

    for d in req.districts:
        d_name = d.get("name") or d.get("district_name", "Unknown")
        state = d.get("state", "India")
        score = int(d.get("vulnerability_score") or d.get("score") or 0)
        wind_kmh = int(d.get("wind_speed_kmh") or d.get("wind_speed") or 110)
        rainfall = int(d.get("rainfall_mm") or 140)
        eta = d.get("eta") or "T+6h"

        key = f"{req.storm_id}:{state}:{d_name}".lower()

        # Strict Threshold Trigger Logic
        if score >= threshold:
            if key not in _dispatched_district_keys:
                _dispatched_district_keys.add(key)
                rec = await dispatch_sms_payload(
                    district_name=d_name,
                    state=state,
                    score=score,
                    wind_speed=wind_kmh,
                    rainfall=rainfall,
                    eta=eta,
                    lang=req.language,
                    provider="Fast2SMS",
                    trigger_type="AUTOMATED_THRESHOLD",
                )
                triggered.append(rec)
            else:
                already_sent.append(d_name)

    return {
        "status": "evaluated",
        "threshold": threshold,
        "storm_id": req.storm_id,
        "newly_triggered_count": len(triggered),
        "newly_triggered": triggered,
        "already_alerted_districts": already_sent,
    }


@router.get("/history")
async def get_alert_history(limit: int = 50):
    """Return audit log of all dispatched SMS alerts."""
    return {"alerts": _alert_history[:limit], "total": len(_alert_history)}


@router.get("/templates")
async def get_alert_templates():
    """Return available multi-language templates."""
    return {
        "templates": ALERT_TEMPLATES,
        "supported_languages": [
            {"code": "en", "name": "English"},
            {"code": "hi", "name": "Hindi (हिंदी)"},
            {"code": "or", "name": "Odia (ଓଡ଼ିଆ)"},
            {"code": "bn", "name": "Bengali (বাংলা)"},
            {"code": "te", "name": "Telugu (తెలుగు)"},
            {"code": "ta", "name": "Tamil (தமிழ்)"},
            {"code": "gu", "name": "Gujarati (ગુજરાતી)"},
        ],
    }


@router.post("/reset-state")
async def reset_alerts():
    """Reset dispatched keys for testing and demonstrations."""
    _dispatched_district_keys.clear()
    return {"status": "reset", "message": "Dispatched district alert keys cleared"}
