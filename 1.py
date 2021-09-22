"""
	DB SCHEMA
	CREATE TABLE `scrapper_amazon` (
		`id` INT(222) AUTO_INCREMENT,
		`product_title` TEXT(250),
		`link` TEXT(500),
		`image_link` TEXT(200),
		`current_price` TEXT(500),
		`scraped_date` timestam,
		`asin` TEXT,
		PRIMARY KEY (`id`)
	);
"""

import requests
from requests_html import HTMLSession
from bs4 import BeautifulSoup
import pandas as pd
import argparse
from urllib.parse import urlparse
import concurrent.futures
from datetime import date
# import mysql.connector
from datetime import datetime
import time

now = datetime.now()
formatted_date = now.strftime('%Y-%m-%d')


# def insertRecord(data):  # data a tuple of your data
#     global mydb


def getdata(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36"}
    time.sleep(5)
    r = s.get(url, headers=headers).text
    soup = BeautifulSoup(r, 'html.parser')
    return soup


def getdeals(soup):
    products = soup.find_all('div', {'data-component-type': 's-search-result'})
    for item in products:
        title = item.find(
            'a', {'class': 'a-link-normal a-text-normal'}).text.strip()
        link = item.find('a', {'class': 'a-link-normal a-text-normal'})['href']
        imagelink = item.find('img', {'class': 's-image'})['src']
        asins = []

        if item.attrs['data-asin'] != '':
            asins.append(item.attrs['data-asin'])

        try:
            saleprice = float(item.find_all(
                'span', {'class': 'a-offscreen'})[0].text.replace('₹', '').replace(',', '').strip())
        except:
            saleprice = soup.find(
                'span', {'class': 'a-offscreen'}).text.replace('₹', '').replace(',', '').strip()

    return


def getnextpage(soup):
    next_ = soup.select_one("li.a-last a")
    if not next_:
        next_ = soup.select_one(".s-pagination-next")
        if not next_:
            return

    return "https://www.amazon.in" + next_["href"]


s = requests.Session()
url = f'https://www.amazon.in/s?i=apparel&bbn=1571271031&rh=n%3A1571271031&dc&fs=true&qid=1627938579&ref=sr_ex_n_1'


while True:
    soup = getdata(url)
    getdeals(soup)
    url = getnextpage(soup)
    if not url:
        break
    else:
        print(url)
