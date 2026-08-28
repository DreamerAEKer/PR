import json
from collections import defaultdict

COMPANIES = {
    'h0032': {'name': 'บ.เอเชี่ยนฮอนด้าคอมเมอร์ส จก.', 'code': 'H0032'},
    'h0128': {'name': 'บ.ไทยเศรษฐกิจประกันภัย จก.(มหาชน)', 'code': 'H0128'},
    'h0130': {'name': 'บ.สิทธิผล 1919 จก.', 'code': 'H0130'},
    'h0143': {'name': 'บ.เอสเอวายเอ(ประเทศไทย)จำกัด', 'code': 'H0143'},
    'h0148': {'name': 'ราชกรีฑาสโมสร', 'code': 'H0148'},
    'h0223': {'name': 'บ.สรรพสินค้าเซ็นทรัล จก.', 'code': 'H0223'},
    'h0241': {'name': 'สำนักงานบริการโทรศัพท์สุรวงศ์', 'code': 'H0241'},
    'h0250': {'name': 'บ.โรงแรมรอยัลออคิด(ปทท) จก.(มหาชน)', 'code': 'H0250'},
    'h0267': {'name': 'หสน.ดัลลัส แอนด์ กิ๊บบินส์', 'code': 'H0267'},
    'h0298': {'name': 'ธ.มิตซูโฮคอร์ปอเรต จก. สาขากรุงเทพฯ', 'code': 'H0298'},
    'h0308': {'name': 'บ.ซิงเกอร์ประเทศไทย จำกัด', 'code': 'H0308'},
    'p0403': {'name': 'บ.พาราวันเซอร์วิส จก.', 'code': 'P0403'},
    'p0574': {'name': 'ธนาคารสากลพาณิชย์แห่งประเทศจีน', 'code': 'P0574'},
    'p0617': {'name': 'บ.อเวนติส ฟาร์มา จก.', 'code': 'P0617'},
    'p0727': {'name': 'บ.ดูปองต์(ประเทศไทย)จก.', 'code': 'P0727'},
    'p1074': {'name': 'บ.พรีเชียส ชิปปิ้ง จก.(มหาชน)', 'code': 'P1074'},
    'p3028': {'name': 'สถานทูตอเมริกา', 'code': 'P3028'},
    'p3064': {'name': 'สถานเอกอัครราชทูตแคนาดา', 'code': 'P3064'},
    'p3088': {'name': 'สถานเอกอัครราชทูตสวิสเซอร์แลนด์', 'code': 'P3088'},
    'p3111': {'name': 'บ.นิวแฮมพ์เชียร์ อินชัวรันส์ จก.', 'code': 'P3111'},
    'p3114': {'name': 'บ.มิตรแท้ประกันภัย จำกัด', 'code': 'P3114'},
    'p3115': {'name': 'บ.ฮี โด ชู (ไทยแลนด์) จก.', 'code': 'P3115'},
    'n20011': {'name': 'บ.ล็อกเล่ย์ (กรุงเทพฯ) จก.', 'code': 'N20011'},
    'n20028': {'name': 'บริษัท ไบเออร์ไทย จำกัด', 'code': 'N20028'},
    'n20032': {'name': 'สำนักกฎหมายดำเนินสมเกียรติและบุญมา', 'code': 'N20032'},
    'n40011': {'name': 'บ.บริหารสินทรัพย์กรุงเทพพาณิชย์การ จก.', 'code': 'N40011'},
    'n40016': {'name': 'บริษัท ฟิลิปประกันชีวิต จำกัด (มหาชน)', 'code': 'N40016'},
    'n40019': {'name': 'Sumitomo Corporation', 'code': 'N40019'},
    'n40021': {'name': 'ธ.แห่งอเมริกา เนชั่นแนล แอสโซซิเอชั่น', 'code': 'N40021'},
    'n40022': {'name': 'เมอร์เซเดส-เบนซ์', 'code': 'N40022'},
    'n40027': {'name': 'สถานทูตเยอรมนี', 'code': 'N40027'}
}

with open("scanned_records.json", "r", encoding="utf-8") as f:
    records = json.load(f)

with open("scanned_readings.json", "r", encoding="utf-8") as f:
    readings = json.load(f)

# Sort both chronologically
records.sort(key=lambda r: r['date'])
readings.sort(key=lambda r: r['date'])

# Group records by month and companyId
records_by_month = defaultdict(lambda: defaultdict(list))
for r in records:
    month = r['date'][:7]
    records_by_month[month][r['companyId']].append(r)

# Group readings by month and companyId
readings_by_month = defaultdict(lambda: defaultdict(list))
for r in readings:
    month = r['date'][:7]
    readings_by_month[month][r['companyId']].append(r)

all_months = sorted(list(set(list(records_by_month.keys()) + list(readings_by_month.keys()))), reverse=True)

# Generate detailed reports in JSON for python parser to output clearly
summary_report = {}

for month in all_months[:3]:
    summary_report[month] = []
    
    # Get all unique companies active in this month
    all_comps = sorted(list(set(list(records_by_month[month].keys()) + list(readings_by_month[month].keys()))))
    
    for comp_id in all_comps:
        comp_info = COMPANIES.get(comp_id, {'name': comp_id.upper(), 'code': comp_id.upper()})
        recs = records_by_month[month].get(comp_id, [])
        reads = readings_by_month[month].get(comp_id, [])
        
        total_amount = sum(r.get('amount', 0) for r in recs)
        
        # Latest machine remaining and accumulated values
        latest_rem = None
        latest_acc = None
        latest_topup = 0
        
        if reads:
            # The last reading in the sorted list of this month
            latest_read = reads[-1]
            latest_rem = latest_read.get('machineRemaining')
            latest_acc = latest_read.get('machineAccumulated')
            latest_topup = latest_read.get('topUpAmount', 0)
            
        summary_report[month].append({
            'code': comp_info['code'],
            'name': comp_info['name'],
            'total_amount': total_amount,
            'machineRemaining': latest_rem,
            'machineAccumulated': latest_acc,
            'topUpAmount': latest_topup
        })

# Print out in clear readable format (with utf-8 writing so it writes clean Thai file)
with open("extracted_monthly_summary.txt", "w", encoding="utf-8") as out:
    for month, data in summary_report.items():
        out.write(f"\n=================== REPORT FOR MONTH: {month} ===================\n")
        out.write(f"{'Code':<6} | {'Company Name':<45} | {'Total Amt':<12} | {'Remaining (Top)':<18} | {'Accumulated (Bottom)':<22} | {'Top Up':<10}\n")
        out.write("-" * 125 + "\n")
        for item in data:
            rem_str = f"{item['machineRemaining']:,.2f}" if item['machineRemaining'] is not None else "-"
            acc_str = f"{item['machineAccumulated']:,.2f}" if item['machineAccumulated'] is not None else "-"
            top_str = f"{item['topUpAmount']:,.2f}" if item['topUpAmount'] > 0 else "-"
            out.write(f"{item['code']:<6} | {item['name']:<45} | {item['total_amount']:<12,.2f} | {rem_str:<18} | {acc_str:<22} | {top_str:<10}\n")

print("Done. Generated summary in extracted_monthly_summary.txt")
