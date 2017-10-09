<?php

/*
 * This file is part of the Сáша framework.
 *
 * (c) tchiotludo <http://github.com/tchiotludo>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types = 1);

namespace Cawa\Spf;

use Cawa\App\HttpFactory;

class HttpApp extends \Cawa\App\HttpApp
{
    use HttpFactory;

    /**
     * @return bool
     */
    public static function isSpf() : bool
    {
        return !is_null(self::request()->getHeader('x-spf-previous'));
    }

    /**
     * overide to handle redirect
     */
    public function end()
    {
        if (self::isSpf()) {
            if (self::response()->getHeader('Location')) {

                // IE & Edge bug fix need a standard redirection
                if (!(
                    preg_match('~MSIE|Internet Explorer~i', self::request()->getHeader('User-Agent')) ||
                    strpos(self::request()->getHeader('User-Agent'), 'Trident/7.0; rv:11.0') !== false ||
                    strpos(self::request()->getHeader('User-Agent'), 'Edge/') !== false
                )) {
                    self::response()->addHeader('Content-Type', 'application/json; charset=utf-8');
                    self::response()->setStatus(307);
                    self::response()->setBody(json_encode([
                        'redirect' => self::response()->getHeader('Location'),
                    ]));
                    self::response()->removeHeader('Location');
                }
            }
        }

        parent::end();
    }
}
