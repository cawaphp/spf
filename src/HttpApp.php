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
use Cawa\Http\ServerRequest;
use Cawa\Net\Uri;

class HttpApp extends \Cawa\App\HttpApp
{
    use HttpFactory;

    /**
     * @return bool
     */
    public static function isSpf() : bool
    {
        return !is_null(self::request()->getHeader('X-Spf-Previous'));
    }

    /**
     * @param ServerRequest $request
     *
     * @return Uri
     */
    public static function getReferer(ServerRequest $request) : ?Uri
    {
        $getValidUri = function (string $url = null) : ?Uri {
            if (!$url) {
                return null;
            }

            $uri = new Uri($url);

            if ($uri->getHostFull() !== self::request()->getUri()->getHostFull()) {
                return null;
            }

            $uri = new Uri($uri->get(true));

            return $uri;
        };

        if ($return = $getValidUri($request->getPostOrQuery('referer'))) {
            return $return;
        }

        if ($return = $getValidUri($request->getHeader('X-Spf-Referer'))) {
            return $return;
        }

        if ($return = $getValidUri($request->getHeader('Referer'))) {
            return $return;
        }

        return null;
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
