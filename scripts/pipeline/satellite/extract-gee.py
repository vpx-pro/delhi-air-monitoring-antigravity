"""
Sentinel-5P NO2 data extraction using Google Earth Engine.
Exports daily mean NO2 column density for Delhi-NCR region as CSV.

Prerequisites:
  pip install earthengine-api
  earthengine authenticate

Usage:
  python scripts/pipeline/satellite/extract-gee.py --start 2020-01-01 --end 2024-12-31 --output data/sentinel5p_no2.csv
"""

import argparse
import csv
import sys
from datetime import datetime, timedelta

try:
    import ee
except ImportError:
    print("ERROR: Install earthengine-api: pip install earthengine-api")
    sys.exit(1)


# Delhi-NCR bounding box
DELHI_NCR = {
    'west': 76.8,
    'south': 28.4,
    'east': 77.4,
    'north': 28.9,
}

PRODUCTS = {
    'NO2': {
        'collection': 'COPERNICUS/S5P/OFFL/L3_NO2',
        'band': 'tropospheric_NO2_column_number_density',
        'unit': 'mol/m2',
        'quality_band': 'tropospheric_NO2_column_number_density_amf',
    },
    'SO2': {
        'collection': 'COPERNICUS/S5P/OFFL/L3_SO2',
        'band': 'SO2_column_number_density',
        'unit': 'mol/m2',
        'quality_band': None,
    },
    'CO': {
        'collection': 'COPERNICUS/S5P/OFFL/L3_CO',
        'band': 'CO_column_number_density',
        'unit': 'mol/m2',
        'quality_band': None,
    },
}


def extract_daily_mean(product_key, start_date, end_date, region):
    """Extract daily mean values for a product over a region."""
    product = PRODUCTS[product_key]
    collection = ee.ImageCollection(product['collection']) \
        .filterDate(start_date, end_date) \
        .filterBounds(region) \
        .select(product['band'])

    def compute_daily(image):
        date = ee.Date(image.get('system:time_start'))
        mean = image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=7000,  # ~7km resolution for S5P
            maxPixels=1e9,
        )
        return ee.Feature(None, {
            'date': date.format('YYYY-MM-dd'),
            'value': mean.get(product['band']),
            'product': product_key,
            'satellite': 'Sentinel-5P',
        })

    features = collection.map(compute_daily)
    return features.getInfo()['features']


def main():
    parser = argparse.ArgumentParser(description='Extract Sentinel-5P data via GEE')
    parser.add_argument('--start', required=True, help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end', required=True, help='End date (YYYY-MM-DD)')
    parser.add_argument('--output', default='data/sentinel5p.csv', help='Output CSV path')
    parser.add_argument('--product', default='NO2', choices=PRODUCTS.keys(), help='Product to extract')
    args = parser.parse_args()

    print(f"Initializing Earth Engine...")
    ee.Initialize()

    region = ee.Geometry.Rectangle([
        DELHI_NCR['west'], DELHI_NCR['south'],
        DELHI_NCR['east'], DELHI_NCR['north'],
    ])

    center_lat = (DELHI_NCR['north'] + DELHI_NCR['south']) / 2
    center_lon = (DELHI_NCR['east'] + DELHI_NCR['west']) / 2

    print(f"Extracting {args.product} from {args.start} to {args.end}...")
    features = extract_daily_mean(args.product, args.start, args.end, region)

    with open(args.output, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['satellite', 'product', 'center_lat', 'center_lon', 'value', 'unit', 'quality_value', 'observed_at'])

        count = 0
        for feat in features:
            props = feat['properties']
            value = props.get('value')
            if value is None:
                continue
            writer.writerow([
                'Sentinel-5P',
                args.product,
                center_lat,
                center_lon,
                value,
                PRODUCTS[args.product]['unit'],
                '',
                f"{props['date']}T12:00:00Z",
            ])
            count += 1

    print(f"Exported {count} rows to {args.output}")


if __name__ == '__main__':
    main()
